import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  CreateRideInput,
  RequestRideInput,
  SearchRidesInput,
} from '../../graphql/generated/schema-types';
import { MatchingService } from './matching.service';

type MockPrisma = {
  ride: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  rideRequest: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const now = new Date('2026-06-12T00:00:00.000Z');
const future = new Date('2026-06-12T08:30:00.000Z');

const driverUser: CurrentUser = {
  id: 'driver-1',
  companyId: 'company-1',
  role: 'DRIVER',
};

const passengerUser: CurrentUser = {
  id: 'passenger-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const createInput: CreateRideInput = {
  departure: { lat: 37.4979, lng: 127.0276 },
  departureAddr: '강남역',
  arrival: { lat: 37.2636, lng: 127.0286 },
  arrivalAddr: '수원역',
  departureTime: future,
  availableSeats: 3,
  fare: 5000,
  preferences: { noSmoking: true },
};

const searchInput: SearchRidesInput = {
  departure: { lat: 37.4979, lng: 127.0276 },
  arrival: { lat: 37.2636, lng: 127.0286 },
  departureTime: future,
  passengers: 1,
  radiusKm: 5,
};

const prismaUser = {
  id: 'driver-1',
  companyId: 'company-1',
  employeeId: 'EMP-1',
  email: 'driver@company.com',
  name: '박준서',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO',
  providerId: 'kakao-driver',
  role: 'DRIVER',
  rating: 4.8,
  rideCount: 42,
  createdAt: now,
  updatedAt: now,
};

const prismaRide = {
  id: 'ride-1',
  companyId: 'company-1',
  driverId: 'driver-1',
  departureLat: 37.4979,
  departureLng: 127.0276,
  departureAddr: '강남역',
  arrivalLat: 37.2636,
  arrivalLng: 127.0286,
  arrivalAddr: '수원역',
  departureTime: future,
  availableSeats: 3,
  fare: 5000,
  recurringDays: null,
  recurringEnd: null,
  preferences: { noSmoking: true },
  status: 'OPEN',
  createdAt: now,
  updatedAt: now,
  driver: prismaUser,
  requests: [],
};

const prismaRequest = {
  id: 'request-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  pickupLat: 37.49,
  pickupLng: 127.02,
  pickupAddr: '강남역 1번 출구',
  message: '문 앞에서 탈게요',
  status: 'PENDING',
  createdAt: now,
  updatedAt: now,
  ride: prismaRide,
  passenger: { ...prismaUser, id: 'passenger-1', role: 'PASSENGER' },
};

describe('MatchingService', () => {
  let service: MatchingService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      ride: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      rideRequest: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: MockPrisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    service = new MatchingService(prisma as never, () => now);
  });

  describe('createRide', () => {
    it('차주가 카풀을 생성한다', async () => {
      prisma.ride.create.mockResolvedValue(prismaRide);

      const result = await service.createRide(driverUser, createInput);

      expect(result.id).toBe('ride-1');
      expect(result.departure.lat).toBe(37.4979);
      const createCall = firstMockArg<{
        data: { companyId: string; driverId: string; availableSeats: number };
      }>(prisma.ride.create);
      expect(createCall.data).toMatchObject({
        companyId: 'company-1',
        driverId: 'driver-1',
        availableSeats: 3,
      });
    });

    it('탑승자는 카풀을 생성할 수 없다', async () => {
      await expect(service.createRide(passengerUser, createInput)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('searchRides', () => {
    it('같은 회사의 반경 내 열린 카풀만 반환한다', async () => {
      prisma.ride.findMany.mockResolvedValue([
        prismaRide,
        {
          ...prismaRide,
          id: 'ride-far',
          departureLat: 37.0,
          arrivalLat: 36.0,
        },
      ]);

      const result = await service.searchRides(passengerUser, searchInput, {
        first: 10,
        after: null,
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.id).toBe('ride-1');
      expect(result.totalCount).toBe(1);
      const findManyCall = firstMockArg<{
        where: { companyId: string; status: string; availableSeats: object };
      }>(prisma.ride.findMany);
      expect(findManyCall.where).toMatchObject({
        companyId: 'company-1',
        status: 'OPEN',
      });
    });

    it('탑승 인원이 1보다 작으면 실패한다', async () => {
      await expect(
        service.searchRides(passengerUser, { ...searchInput, passengers: 0 }, null),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('requestRide', () => {
    const input: RequestRideInput = {
      rideId: 'ride-1',
      pickup: { lat: 37.49, lng: 127.02 },
      pickupAddr: '강남역 1번 출구',
      message: '문 앞에서 탈게요',
    };

    it('탑승 요청을 생성한다', async () => {
      prisma.ride.findUnique.mockResolvedValue(prismaRide);
      prisma.rideRequest.findFirst.mockResolvedValue(null);
      prisma.rideRequest.create.mockResolvedValue(prismaRequest);

      const result = await service.requestRide(passengerUser, input);

      expect(result.id).toBe('request-1');
      expect(result.pickup?.lat).toBe(37.49);
      const createCall = firstMockArg<{
        data: { passengerId: string; rideId: string };
      }>(prisma.rideRequest.create);
      expect(createCall.data).toMatchObject({
        rideId: 'ride-1',
        passengerId: 'passenger-1',
      });
    });

    it('중복 요청은 실패한다', async () => {
      prisma.ride.findUnique.mockResolvedValue(prismaRide);
      prisma.rideRequest.findFirst.mockResolvedValue(prismaRequest);

      await expect(service.requestRide(passengerUser, input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('acceptRideRequest', () => {
    it('차주가 요청을 수락하면 좌석을 감소시킨다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue(prismaRequest);
      prisma.rideRequest.update.mockResolvedValue({ ...prismaRequest, status: 'ACCEPTED' });
      prisma.ride.update.mockResolvedValue({ ...prismaRide, availableSeats: 2 });

      const result = await service.acceptRideRequest(driverUser, 'request-1');

      expect(result.status).toBe('ACCEPTED');
      expect(prisma.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ride-1' },
          data: { availableSeats: { decrement: 1 } },
        }),
      );
    });
  });

  describe('rejectRideRequest', () => {
    it('차주가 요청을 거절한다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue(prismaRequest);
      prisma.rideRequest.update.mockResolvedValue({ ...prismaRequest, status: 'REJECTED' });

      const result = await service.rejectRideRequest(driverUser, 'request-1');

      expect(result.status).toBe('REJECTED');
      expect(prisma.rideRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'request-1' },
          data: { status: 'REJECTED' },
        }),
      );
    });

    it('다른 차주의 요청은 처리할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({
        ...prismaRequest,
        ride: { ...prismaRide, driverId: 'other-driver' },
      });

      await expect(service.rejectRideRequest(driverUser, 'request-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
