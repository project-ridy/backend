import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  CalculateFareInput,
  RegisterPaymentMethodInput,
} from '../../graphql/generated/schema-types';
import { PaymentService } from './payment.service';

type MockPrisma = {
  company: {
    findUnique: jest.Mock;
  };
  settlement: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  paymentMethod: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
  };
};

const now = new Date('2026-06-12T00:00:00.000Z');

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const passengerUser: CurrentUser = {
  id: 'passenger-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const driverUser: CurrentUser = {
  id: 'driver-1',
  companyId: 'company-1',
  role: 'DRIVER',
};

const fareInput: CalculateFareInput = {
  departure: { lat: 0, lng: 0 },
  arrival: { lat: 0, lng: 0.2563 },
  passengers: 3,
};

const prismaUser = {
  id: 'passenger-1',
  companyId: 'company-1',
  employeeId: 'EMP-1',
  email: 'passenger@company.com',
  name: '김승객',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO',
  providerId: 'kakao-passenger',
  role: 'PASSENGER',
  rating: 4.8,
  rideCount: 3,
  createdAt: now,
  updatedAt: now,
};

const prismaDriver = {
  ...prismaUser,
  id: 'driver-1',
  email: 'driver@company.com',
  name: '박차주',
  role: 'DRIVER',
};

const prismaRide = {
  id: 'ride-1',
  companyId: 'company-1',
  driverId: 'driver-1',
  departureLat: 0,
  departureLng: 0,
  departureAddr: '출발지',
  arrivalLat: 0,
  arrivalLng: 0.2563,
  arrivalAddr: '도착지',
  departureTime: now,
  availableSeats: 3,
  fare: 14970,
  recurringDays: null,
  recurringEnd: null,
  preferences: null,
  status: 'COMPLETED',
  createdAt: now,
  updatedAt: now,
  driver: prismaDriver,
  requests: [],
};

const prismaSettlement = {
  id: 'settlement-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  companyId: 'company-1',
  amount: 5240,
  driverAmount: 4740,
  platformFee: 250,
  companyFee: 0,
  passengerFee: 250,
  status: 'PENDING',
  dueDate: null,
  paidAt: null,
  createdAt: now,
  ride: prismaRide,
  passenger: prismaUser,
};

describe('PaymentService', () => {
  let prisma: MockPrisma;
  let gateway: { approvePayment: jest.Mock };
  let service: PaymentService;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
      },
      settlement: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentMethod: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    gateway = {
      approvePayment: jest.fn().mockResolvedValue({ approved: true }),
    };
    service = new PaymentService(prisma as never, gateway);
  });

  describe('calculateFare', () => {
    it('FREE 플랜 요금을 계산한다', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'company-1', plan: 'FREE' });

      const result = await service.calculateFare(passengerUser, fareInput);

      expect(result).toEqual({
        distanceKm: 28.5,
        baseFare: 4990,
        platformFee: 250,
        companySubsidy: 0,
        passengerAmount: 5240,
        driverAmount: 4740,
      });
    });

    it('PRO 플랜은 플랫폼 수수료 절반을 회사 보조금으로 처리한다', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'company-1', plan: 'PRO' });

      const result = await service.calculateFare(passengerUser, fareInput);

      expect(result.companySubsidy).toBe(125);
      expect(result.passengerAmount).toBe(5115);
      expect(result.driverAmount).toBe(4740);
    });

    it('ENTERPRISE 플랜은 플랫폼 수수료를 회사 보조금으로 처리한다', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'company-1', plan: 'ENTERPRISE' });

      const result = await service.calculateFare(passengerUser, fareInput);

      expect(result.companySubsidy).toBe(250);
      expect(result.passengerAmount).toBe(4990);
      expect(result.driverAmount).toBe(4740);
    });

    it('탑승 인원이 1보다 작으면 거부한다', async () => {
      await expect(
        service.calculateFare(passengerUser, { ...fareInput, passengers: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('출발지와 도착지가 같으면 거부한다', async () => {
      await expect(
        service.calculateFare(passengerUser, {
          departure: { lat: 37, lng: 127 },
          arrival: { lat: 37, lng: 127 },
          passengers: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('mySettlements', () => {
    it('내 정산 목록을 조회한다', async () => {
      prisma.settlement.findMany.mockResolvedValue([prismaSettlement]);

      const result = await service.mySettlements(passengerUser, { first: 10, after: null });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('PENDING');
      const findManyCall = firstMockArg<{ where: { companyId: string }; take: number }>(
        prisma.settlement.findMany,
      );
      expect(findManyCall.where.companyId).toBe('company-1');
      expect(findManyCall.take).toBe(10);
    });

    it('정산이 없으면 빈 배열을 반환한다', async () => {
      prisma.settlement.findMany.mockResolvedValue([]);

      await expect(service.mySettlements(passengerUser, null)).resolves.toEqual([]);
    });
  });

  describe('settlementDetail', () => {
    it('정산 상세를 조회한다', async () => {
      prisma.settlement.findFirst.mockResolvedValue(prismaSettlement);

      const result = await service.settlementDetail(passengerUser, 'settlement-1');

      expect(result.id).toBe('settlement-1');
      expect(result.ride.id).toBe('ride-1');
    });

    it('무관한 정산 상세 접근을 거부한다', async () => {
      prisma.settlement.findFirst.mockResolvedValue(null);

      await expect(service.settlementDetail(passengerUser, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('paySettlement', () => {
    it('정산 결제를 승인한다', async () => {
      prisma.settlement.findFirst.mockResolvedValue(prismaSettlement);
      prisma.settlement.update.mockResolvedValue({
        ...prismaSettlement,
        status: 'COMPLETED',
        paidAt: now,
      });

      const result = await service.paySettlement(passengerUser, 'settlement-1', 'idem-1');

      expect(result.status).toBe('PAID');
      expect(gateway.approvePayment).toHaveBeenCalledWith({
        idempotencyKey: 'idem-1',
        settlementId: 'settlement-1',
        amount: 5240,
      });
    });

    it('차주가 승객 정산을 결제할 수 없다', async () => {
      prisma.settlement.findFirst.mockResolvedValue(prismaSettlement);

      await expect(
        service.paySettlement(driverUser, 'settlement-1', 'idem-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('이미 결제된 정산 결제를 거부한다', async () => {
      prisma.settlement.findFirst.mockResolvedValue({ ...prismaSettlement, status: 'COMPLETED' });

      await expect(
        service.paySettlement(passengerUser, 'settlement-1', 'idem-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('멱등키가 없으면 결제를 거부한다', async () => {
      await expect(
        service.paySettlement(passengerUser, 'settlement-1', ' '),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('payment methods', () => {
    const input: RegisterPaymentMethodInput = {
      type: 'CARD',
      billingKey: 'billing-key-1',
      alias: '개인 카드',
      isDefault: false,
    };

    it('첫 결제수단을 기본 결제수단으로 등록한다', async () => {
      prisma.paymentMethod.count.mockResolvedValue(0);
      prisma.paymentMethod.create.mockResolvedValue({
        id: 'payment-method-1',
        userId: 'passenger-1',
        type: 'CARD',
        billingKey: 'billing-key-1',
        alias: '개인 카드',
        isDefault: true,
        createdAt: now,
      });

      const result = await service.registerPaymentMethod(passengerUser, input);

      expect(result.isDefault).toBe(true);
      expect(result.type).toBe('CARD');
    });

    it('내 결제수단 목록을 조회한다', async () => {
      prisma.paymentMethod.findMany.mockResolvedValue([
        {
          id: 'payment-method-1',
          userId: 'passenger-1',
          type: 'CARD',
          billingKey: 'billing-key-1',
          alias: '개인 카드',
          isDefault: true,
          createdAt: now,
        },
      ]);

      const result = await service.myPaymentMethods(passengerUser);

      expect(result).toHaveLength(1);
      expect(result[0]?.alias).toBe('개인 카드');
    });

    it('내 결제수단을 삭제한다', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue({ id: 'payment-method-1' });
      prisma.paymentMethod.delete.mockResolvedValue({ id: 'payment-method-1' });

      await expect(service.deletePaymentMethod(passengerUser, 'payment-method-1')).resolves.toBe(
        true,
      );
    });
  });
});
