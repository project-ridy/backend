import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  CalculateFareInput,
  FareCalculation,
  PaginationInput,
  PaymentMethod,
  RegisterPaymentMethodInput,
  Ride,
  Settlement,
  SettlementStatus,
  User,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';
import type { PaymentGateway } from './payment-gateway';
import { PAYMENT_GATEWAY } from './payment-gateway';

export { PAYMENT_GATEWAY };

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const BASE_FARE = 3000;
const DISTANCE_FARE_PER_KM = 420;
const PLATFORM_FEE_RATE = 0.05;
const MAX_DISTANCE_KM = 200;

const settlementInclude = {
  ride: {
    include: {
      driver: true,
      requests: {
        include: {
          passenger: true,
        },
      },
    },
  },
  passenger: true,
} satisfies Prisma.SettlementInclude;

type SettlementRecord = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;
type RideRecord = SettlementRecord['ride'];
type RideRequestRecord = RideRecord['requests'][number];
type UserRecord = Prisma.UserGetPayload<object>;
type PaymentMethodRecord = Prisma.PaymentMethodGetPayload<object>;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async calculateFare(
    currentUser: CurrentUser,
    input: CalculateFareInput,
  ): Promise<FareCalculation> {
    const passengers = input.passengers ?? 1;
    if (passengers < 1) {
      throw new BadRequestException('탑승 인원은 1명 이상이어야 합니다');
    }

    const distanceKm = roundToOneDecimal(distanceInKm(input.departure, input.arrival));
    if (distanceKm === 0) {
      throw new BadRequestException('출발지와 도착지가 같을 수 없습니다');
    }
    if (distanceKm > MAX_DISTANCE_KM) {
      throw new BadRequestException('카풀 거리는 200km 이내여야 합니다');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: currentUser.companyId },
      select: { id: true, plan: true },
    });
    if (!company) {
      throw new NotFoundException('회사를 찾을 수 없습니다');
    }

    const totalFare = BASE_FARE + Math.round(distanceKm * DISTANCE_FARE_PER_KM);
    const perPassenger = Math.ceil(totalFare / passengers);
    const platformFee = Math.ceil(perPassenger * PLATFORM_FEE_RATE);
    const companySubsidy = companySubsidyForPlan(company.plan, platformFee);
    const passengerFee = platformFee - companySubsidy;

    return {
      distanceKm,
      baseFare: perPassenger,
      platformFee,
      companySubsidy,
      passengerAmount: perPassenger + passengerFee,
      driverAmount: perPassenger - platformFee,
    };
  }

  async mySettlements(
    currentUser: CurrentUser,
    pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<Settlement>> {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        companyId: currentUser.companyId,
        OR: [{ passengerId: currentUser.id }, { ride: { driverId: currentUser.id } }],
      },
      include: settlementInclude,
      orderBy: { createdAt: 'desc' },
      take: this.pageSize(pagination),
    });

    return settlements.map((settlement) => this.mapSettlement(settlement));
  }

  async settlementDetail(currentUser: CurrentUser, id: string): Promise<Settlement> {
    const settlement = await this.prisma.settlement.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
        OR: [{ passengerId: currentUser.id }, { ride: { driverId: currentUser.id } }],
      },
      include: settlementInclude,
    });
    if (!settlement) {
      throw new NotFoundException('정산을 찾을 수 없습니다');
    }

    return this.mapSettlement(settlement);
  }

  async paySettlement(
    currentUser: CurrentUser,
    settlementId: string,
    idempotencyKey: string,
  ): Promise<Settlement> {
    if (!idempotencyKey.trim()) {
      throw new BadRequestException('멱등키가 필요합니다');
    }

    const settlement = await this.prisma.settlement.findFirst({
      where: {
        id: settlementId,
        companyId: currentUser.companyId,
      },
      include: settlementInclude,
    });
    if (!settlement) {
      throw new NotFoundException('정산을 찾을 수 없습니다');
    }
    if (settlement.passengerId !== currentUser.id) {
      throw new ForbiddenException('본인 정산만 결제할 수 있습니다');
    }
    if (settlement.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제 완료된 정산입니다');
    }
    if (settlement.status !== 'PENDING') {
      throw new BadRequestException('결제 가능한 정산 상태가 아닙니다');
    }

    const paymentResult = await this.paymentGateway.approvePayment({
      settlementId,
      amount: settlement.amount,
      idempotencyKey,
    });
    if (!paymentResult.approved) {
      throw new BadRequestException(paymentResult.failureReason ?? '결제 승인에 실패했습니다');
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
      include: settlementInclude,
    });

    return this.mapSettlement(updated);
  }

  async registerPaymentMethod(
    currentUser: CurrentUser,
    input: RegisterPaymentMethodInput,
  ): Promise<PaymentMethod> {
    const billingKey = input.billingKey.trim();
    if (!billingKey) {
      throw new BadRequestException('billingKey가 필요합니다');
    }

    const existingCount = await this.prisma.paymentMethod.count({
      where: { userId: currentUser.id },
    });
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        userId: currentUser.id,
        type: input.type,
        billingKey,
        alias: input.alias?.trim() || null,
        isDefault: existingCount === 0 || (input.isDefault ?? false),
      },
    });

    return this.mapPaymentMethod(paymentMethod);
  }

  async myPaymentMethods(currentUser: CurrentUser): Promise<ReadonlyArray<PaymentMethod>> {
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId: currentUser.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return paymentMethods.map((paymentMethod) => this.mapPaymentMethod(paymentMethod));
  }

  async deletePaymentMethod(currentUser: CurrentUser, id: string): Promise<boolean> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id, userId: currentUser.id },
    });
    if (!paymentMethod) {
      throw new NotFoundException('결제수단을 찾을 수 없습니다');
    }

    await this.prisma.paymentMethod.delete({ where: { id } });
    return true;
  }

  private pageSize(pagination: PaginationInput | null): number {
    const first = pagination?.first ?? DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
  }

  private mapSettlement(settlement: SettlementRecord): Settlement {
    return {
      id: settlement.id,
      ride: this.mapRide(settlement.ride),
      passenger: this.mapUser(settlement.passenger),
      amount: settlement.amount,
      driverAmount: settlement.driverAmount,
      platformFee: settlement.platformFee,
      companyFee: settlement.companyFee,
      passengerFee: settlement.passengerFee,
      status: this.mapSettlementStatus(settlement.status),
      dueDate: settlement.dueDate,
      paidAt: settlement.paidAt,
      createdAt: settlement.createdAt,
    };
  }

  private mapSettlementStatus(status: SettlementRecord['status']): SettlementStatus {
    if (status === 'COMPLETED') {
      return 'PAID';
    }
    if (status === 'REFUNDED') {
      return 'CANCELLED';
    }
    return status;
  }

  private mapPaymentMethod(paymentMethod: PaymentMethodRecord): PaymentMethod {
    return {
      id: paymentMethod.id,
      type: paymentMethod.type as PaymentMethod['type'],
      alias: paymentMethod.alias,
      isDefault: paymentMethod.isDefault,
      createdAt: paymentMethod.createdAt,
    };
  }

  private mapRide(ride: RideRecord): Ride {
    return {
      id: ride.id,
      companyId: ride.companyId,
      driver: this.mapUser(ride.driver),
      departure: {
        lat: numberValue(ride.departureLat),
        lng: numberValue(ride.departureLng),
      },
      departureAddr: ride.departureAddr,
      arrival: {
        lat: numberValue(ride.arrivalLat),
        lng: numberValue(ride.arrivalLng),
      },
      arrivalAddr: ride.arrivalAddr,
      departureTime: ride.departureTime,
      availableSeats: ride.availableSeats,
      fare: ride.fare,
      preferences: jsonObject(ride.preferences),
      status: ride.status,
      requests: ride.requests.map((request) => this.mapRideRequest(request, ride)),
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };
  }

  private mapRideRequest(request: RideRequestRecord, ride: RideRecord): Ride['requests'][number] {
    return {
      id: request.id,
      ride: {
        ...this.mapRide({ ...ride, requests: [] }),
        requests: [],
      },
      passenger: this.mapUser(request.passenger),
      pickup:
        request.pickupLat === null || request.pickupLng === null
          ? null
          : {
              lat: numberValue(request.pickupLat),
              lng: numberValue(request.pickupLng),
            },
      pickupAddr: request.pickupAddr,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private mapUser(user: UserRecord): User {
    return {
      id: user.id,
      companyId: user.companyId,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      imageUrl: user.imageUrl,
      provider: user.provider,
      providerId: user.providerId,
      role: user.role,
      rating: numberValue(user.rating),
      rideCount: user.rideCount,
      company: null,
      vehicles: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

function companySubsidyForPlan(plan: string, platformFee: number): number {
  if (plan === 'ENTERPRISE') {
    return platformFee;
  }
  if (plan === 'PRO') {
    return Math.floor(platformFee / 2);
  }
  return 0;
}

function distanceInKm(
  departure: { readonly lat: number; readonly lng: number },
  arrival: { readonly lat: number; readonly lng: number },
): number {
  const toRad = (degree: number): number => (degree * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(arrival.lat - departure.lat);
  const dLng = toRad(arrival.lng - departure.lng);
  const fromLat = toRad(departure.lat);
  const toLat = toRad(arrival.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function numberValue(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  return value;
}
