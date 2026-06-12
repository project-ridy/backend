import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  CreateRideInput,
  PaginationInput,
  RequestRideInput,
  RequestStatus,
  Ride,
  RideConnection,
  RideRequest,
  RideStatus,
  SearchRidesInput,
  User,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_RADIUS_KM = 5;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const rideInclude = {
  driver: true,
  requests: {
    include: {
      passenger: true,
    },
  },
} satisfies Prisma.RideInclude;

const rideRequestInclude = {
  passenger: true,
  ride: {
    include: rideInclude,
  },
} satisfies Prisma.RideRequestInclude;

type RideRecord = Prisma.RideGetPayload<{ include: typeof rideInclude }>;
type RideRequestRecord = Prisma.RideRequestGetPayload<{ include: typeof rideRequestInclude }>;
type UserRecord = Prisma.UserGetPayload<object>;
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nowProvider: () => Date = () => new Date(),
  ) {}

  async createRide(currentUser: CurrentUser, input: CreateRideInput): Promise<Ride> {
    this.assertCanDrive(currentUser);
    this.validateRideInput(input);

    const ride = await this.prisma.ride.create({
      data: {
        companyId: currentUser.companyId,
        driverId: currentUser.id,
        departureLat: input.departure.lat,
        departureLng: input.departure.lng,
        departureAddr: input.departureAddr ?? undefined,
        arrivalLat: input.arrival.lat,
        arrivalLng: input.arrival.lng,
        arrivalAddr: input.arrivalAddr ?? undefined,
        departureTime: input.departureTime,
        availableSeats: input.availableSeats,
        fare: input.fare ?? undefined,
        preferences: jsonInput(input.preferences),
      },
      include: rideInclude,
    });

    return this.mapRide(ride);
  }

  async searchRides(
    currentUser: CurrentUser,
    input: SearchRidesInput,
    pagination: PaginationInput | null,
  ): Promise<RideConnection> {
    const passengers = input.passengers ?? 1;
    if (passengers < 1) {
      throw new BadRequestException('탑승 인원은 1명 이상이어야 합니다');
    }

    const first = this.pageSize(pagination);
    const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
    const candidates = await this.prisma.ride.findMany({
      where: {
        companyId: currentUser.companyId,
        status: 'OPEN',
        availableSeats: {
          gte: passengers,
        },
        departureTime: {
          gte: input.departureTime,
        },
        driverId: {
          not: currentUser.id,
        },
      },
      include: rideInclude,
      orderBy: {
        departureTime: 'asc',
      },
    });

    const filtered = candidates.filter((ride) => {
      const departureDistance = distanceKm(
        input.departure.lat,
        input.departure.lng,
        numberValue(ride.departureLat),
        numberValue(ride.departureLng),
      );
      const arrivalDistance = distanceKm(
        input.arrival.lat,
        input.arrival.lng,
        numberValue(ride.arrivalLat),
        numberValue(ride.arrivalLng),
      );

      return departureDistance <= radiusKm && arrivalDistance <= radiusKm;
    });
    const nodes = filtered.slice(0, first).map((ride) => this.mapRide(ride));

    return {
      nodes,
      totalCount: filtered.length,
      pageInfo: {
        hasNextPage: filtered.length > first,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    };
  }

  async ride(currentUser: CurrentUser, id: string): Promise<Ride> {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      include: rideInclude,
    });

    if (!ride) {
      throw new NotFoundException('카풀을 찾을 수 없습니다');
    }

    return this.mapRide(ride);
  }

  async myRides(
    currentUser: CurrentUser,
    status: RideStatus | null,
    pagination: PaginationInput | null,
  ): Promise<RideConnection> {
    const first = this.pageSize(pagination);
    const rides = await this.prisma.ride.findMany({
      where: {
        companyId: currentUser.companyId,
        driverId: currentUser.id,
        status: status ?? undefined,
      },
      include: rideInclude,
      orderBy: {
        departureTime: 'asc',
      },
      take: first + 1,
    });
    const nodes = rides.slice(0, first).map((ride) => this.mapRide(ride));

    return {
      nodes,
      totalCount: nodes.length,
      pageInfo: {
        hasNextPage: rides.length > first,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    };
  }

  async myRideRequests(
    currentUser: CurrentUser,
    status: RequestStatus | null,
    pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<RideRequest>> {
    const requests = await this.prisma.rideRequest.findMany({
      where: {
        passengerId: currentUser.id,
        status: status ?? undefined,
        ride: {
          companyId: currentUser.companyId,
        },
      },
      include: rideRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: this.pageSize(pagination),
    });

    return requests.map((request) => this.mapRideRequest(request));
  }

  async updateRide(currentUser: CurrentUser, id: string, input: CreateRideInput): Promise<Ride> {
    this.assertCanDrive(currentUser);
    this.validateRideInput(input);
    await this.findOwnedRide(currentUser, id);

    const ride = await this.prisma.ride.update({
      where: { id },
      data: {
        departureLat: input.departure.lat,
        departureLng: input.departure.lng,
        departureAddr: input.departureAddr ?? undefined,
        arrivalLat: input.arrival.lat,
        arrivalLng: input.arrival.lng,
        arrivalAddr: input.arrivalAddr ?? undefined,
        departureTime: input.departureTime,
        availableSeats: input.availableSeats,
        fare: input.fare ?? undefined,
        preferences: jsonInput(input.preferences),
      },
      include: rideInclude,
    });

    return this.mapRide(ride);
  }

  async cancelRide(currentUser: CurrentUser, id: string): Promise<Ride> {
    await this.findOwnedRide(currentUser, id);

    const ride = await this.prisma.ride.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: rideInclude,
    });

    return this.mapRide(ride);
  }

  async requestRide(currentUser: CurrentUser, input: RequestRideInput): Promise<RideRequest> {
    const ride = await this.prisma.ride.findUnique({
      where: {
        id: input.rideId,
      },
      include: rideInclude,
    });

    if (!ride || ride.companyId !== currentUser.companyId) {
      throw new NotFoundException('카풀을 찾을 수 없습니다');
    }
    if (ride.driverId === currentUser.id) {
      throw new BadRequestException('본인이 만든 카풀에는 요청할 수 없습니다');
    }
    if (ride.status !== 'OPEN') {
      throw new BadRequestException('요청할 수 없는 카풀입니다');
    }
    if (ride.availableSeats < 1) {
      throw new BadRequestException('남은 좌석이 없습니다');
    }

    const duplicate = await this.prisma.rideRequest.findFirst({
      where: {
        rideId: input.rideId,
        passengerId: currentUser.id,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
    });

    if (duplicate) {
      throw new ConflictException('이미 요청한 카풀입니다');
    }

    const request = await this.prisma.rideRequest.create({
      data: {
        rideId: input.rideId,
        passengerId: currentUser.id,
        pickupLat: input.pickup?.lat ?? undefined,
        pickupLng: input.pickup?.lng ?? undefined,
        pickupAddr: input.pickupAddr ?? undefined,
        message: input.message ?? undefined,
      },
      include: rideRequestInclude,
    });

    return this.mapRideRequest(request);
  }

  async acceptRideRequest(currentUser: CurrentUser, id: string): Promise<RideRequest> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.findOwnedRequest(tx, currentUser, id);

      if (request.status !== 'PENDING') {
        throw new BadRequestException('대기 중인 요청만 수락할 수 있습니다');
      }
      if (request.ride.availableSeats < 1) {
        throw new BadRequestException('남은 좌석이 없습니다');
      }

      const accepted = await tx.rideRequest.update({
        where: { id },
        data: { status: 'ACCEPTED' },
        include: rideRequestInclude,
      });
      await tx.ride.update({
        where: { id: request.rideId },
        data: { availableSeats: { decrement: 1 } },
      });

      return this.mapRideRequest(accepted);
    });
  }

  async rejectRideRequest(currentUser: CurrentUser, id: string): Promise<RideRequest> {
    const request = await this.findOwnedRequest(this.prisma, currentUser, id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 요청만 거절할 수 있습니다');
    }

    const rejected = await this.prisma.rideRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: rideRequestInclude,
    });

    return this.mapRideRequest(rejected);
  }

  async cancelRideRequest(currentUser: CurrentUser, id: string): Promise<RideRequest> {
    const request = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: rideRequestInclude,
    });

    if (
      !request ||
      request.passengerId !== currentUser.id ||
      request.ride.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('카풀 요청을 찾을 수 없습니다');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 요청만 취소할 수 있습니다');
    }

    const cancelled = await this.prisma.rideRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: rideRequestInclude,
    });

    return this.mapRideRequest(cancelled);
  }

  private async findOwnedRide(currentUser: CurrentUser, id: string): Promise<RideRecord> {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
        driverId: currentUser.id,
      },
      include: rideInclude,
    });

    if (!ride) {
      throw new NotFoundException('카풀을 찾을 수 없습니다');
    }

    return ride;
  }

  private async findOwnedRequest(
    prisma: PrismaExecutor,
    currentUser: CurrentUser,
    id: string,
  ): Promise<RideRequestRecord> {
    const request = await prisma.rideRequest.findUnique({
      where: { id },
      include: rideRequestInclude,
    });

    if (
      !request ||
      request.ride.companyId !== currentUser.companyId ||
      request.ride.driverId !== currentUser.id
    ) {
      throw new NotFoundException('카풀 요청을 찾을 수 없습니다');
    }

    return request;
  }

  private assertCanDrive(currentUser: CurrentUser): void {
    if (!['DRIVER', 'BOTH', 'ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenException('차주만 카풀을 생성할 수 있습니다');
    }
  }

  private validateRideInput(input: CreateRideInput): void {
    if (input.availableSeats < 1) {
      throw new BadRequestException('좌석은 1개 이상이어야 합니다');
    }
    if (input.departureTime <= this.nowProvider()) {
      throw new BadRequestException('출발 시간은 미래여야 합니다');
    }
    if (input.departure.lat === input.arrival.lat && input.departure.lng === input.arrival.lng) {
      throw new BadRequestException('출발지와 도착지는 달라야 합니다');
    }
  }

  private pageSize(pagination: PaginationInput | null): number {
    const first = pagination?.first ?? DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
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
      requests: ride.requests.map((request) =>
        this.mapRideRequest({
          ...request,
          ride,
        }),
      ),
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };
  }

  private mapRideRequest(request: RideRequestRecord): RideRequest {
    return {
      id: request.id,
      ride: this.mapRide(request.ride),
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

function numberValue(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  return value;
}

function jsonInput(value: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  return value === null ? undefined : (value as Prisma.InputJsonValue);
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLat = degreesToRadians(toLat - fromLat);
  const dLng = degreesToRadians(toLng - fromLng);
  const lat1 = degreesToRadians(fromLat);
  const lat2 = degreesToRadians(toLat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
