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
  chatRoom: {
    upsert: jest.Mock;
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
      chatRoom: {
        upsert: jest.fn(),
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

    it('좌석이 1보다 작으면 실패한다', async () => {
      await expect(
        service.createRide(driverUser, { ...createInput, availableSeats: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
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

  describe('ride', () => {
    it('같은 회사 카풀 상세를 반환한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);

      const result = await service.ride(passengerUser, 'ride-1');

      expect(result.id).toBe('ride-1');
      expect(result.driver.id).toBe('driver-1');
      const findCall = firstMockArg<{ where: { companyId: string; id: string } }>(
        prisma.ride.findFirst,
      );
      expect(findCall.where).toMatchObject({ id: 'ride-1', companyId: 'company-1' });
    });

    it('카풀을 찾지 못하면 실패한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(null);

      await expect(service.ride(passengerUser, 'missing-ride')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('myRides', () => {
    it('차주의 카풀 목록을 페이지 정보와 함께 반환한다', async () => {
      prisma.ride.findMany.mockResolvedValue([
        prismaRide,
        { ...prismaRide, id: 'ride-2', departureTime: new Date('2026-06-12T09:00:00.000Z') },
      ]);

      const result = await service.myRides(driverUser, 'OPEN', { first: 1, after: null });

      expect(result.nodes).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBe('ride-1');
      const findCall = firstMockArg<{ take: number; where: { driverId: string; status: string } }>(
        prisma.ride.findMany,
      );
      expect(findCall.take).toBe(2);
      expect(findCall.where).toMatchObject({ driverId: 'driver-1', status: 'OPEN' });
    });
  });

  describe('myRideRequests', () => {
    it('탑승자의 요청 목록을 반환한다', async () => {
      prisma.rideRequest.findMany.mockResolvedValue([prismaRequest]);

      const result = await service.myRideRequests(passengerUser, 'PENDING', {
        first: 10,
        after: null,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('request-1');
      const findCall = firstMockArg<{
        where: { passengerId: string; status: string; ride: { companyId: string } };
      }>(prisma.rideRequest.findMany);
      expect(findCall.where).toMatchObject({
        passengerId: 'passenger-1',
        status: 'PENDING',
        ride: { companyId: 'company-1' },
      });
    });
  });

  describe('updateRide', () => {
    it('차주가 본인의 카풀을 수정한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.ride.update.mockResolvedValue({ ...prismaRide, availableSeats: 2 });

      const result = await service.updateRide(driverUser, 'ride-1', {
        ...createInput,
        availableSeats: 2,
      });

      expect(result.availableSeats).toBe(2);
      const updateCall = firstMockArg<{ data: { availableSeats: number }; where: { id: string } }>(
        prisma.ride.update,
      );
      expect(updateCall.where).toEqual({ id: 'ride-1' });
      expect(updateCall.data.availableSeats).toBe(2);
    });

    it('다른 차주의 카풀은 수정할 수 없다', async () => {
      prisma.ride.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRide(driverUser, 'ride-other', createInput),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancelRide', () => {
    it('차주가 본인의 카풀을 취소한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.ride.update.mockResolvedValue({ ...prismaRide, status: 'CANCELLED' });

      const result = await service.cancelRide(driverUser, 'ride-1');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ride-1' },
          data: { status: 'CANCELLED' },
        }),
      );
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

    it('본인이 만든 카풀에는 요청할 수 없다', async () => {
      prisma.ride.findUnique.mockResolvedValue(prismaRide);

      await expect(service.requestRide(driverUser, input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('남은 좌석이 없으면 요청할 수 없다', async () => {
      prisma.ride.findUnique.mockResolvedValue({ ...prismaRide, availableSeats: 0 });

      await expect(service.requestRide(passengerUser, input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('열린 상태가 아니면 요청할 수 없다', async () => {
      prisma.ride.findUnique.mockResolvedValue({ ...prismaRide, status: 'CANCELLED' });

      await expect(service.requestRide(passengerUser, input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('다른 회사 카풀은 찾을 수 없다', async () => {
      prisma.ride.findUnique.mockResolvedValue({ ...prismaRide, companyId: 'company-other' });

      await expect(service.requestRide(passengerUser, input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('acceptRideRequest', () => {
    it('차주가 요청을 수락하면 좌석을 감소시킨다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue(prismaRequest);
      prisma.rideRequest.update.mockResolvedValue({ ...prismaRequest, status: 'ACCEPTED' });
      prisma.ride.update.mockResolvedValue({ ...prismaRide, availableSeats: 2 });
      prisma.chatRoom.upsert.mockResolvedValue({ id: 'room-1', rideId: 'ride-1', createdAt: now });

      const result = await service.acceptRideRequest(driverUser, 'request-1');

      expect(result.status).toBe('ACCEPTED');
      expect(prisma.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ride-1' },
          data: { availableSeats: { decrement: 1 } },
        }),
      );
      expect(prisma.chatRoom.upsert).toHaveBeenCalledWith({
        where: { rideId: 'ride-1' },
        create: { rideId: 'ride-1' },
        update: {},
      });
    });

    it('남은 좌석이 없으면 요청을 수락할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({
        ...prismaRequest,
        ride: { ...prismaRide, availableSeats: 0 },
      });

      await expect(service.acceptRideRequest(driverUser, 'request-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('이미 처리된 요청은 수락할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({ ...prismaRequest, status: 'ACCEPTED' });

      await expect(service.acceptRideRequest(driverUser, 'request-1')).rejects.toBeInstanceOf(
        BadRequestException,
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

    it('이미 처리된 요청은 거절할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({ ...prismaRequest, status: 'ACCEPTED' });

      await expect(service.rejectRideRequest(driverUser, 'request-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('cancelRideRequest', () => {
    it('탑승자가 본인의 대기 요청을 취소한다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue(prismaRequest);
      prisma.rideRequest.update.mockResolvedValue({ ...prismaRequest, status: 'CANCELLED' });

      const result = await service.cancelRideRequest(passengerUser, 'request-1');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.rideRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'request-1' },
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it('다른 사용자의 요청은 취소할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({
        ...prismaRequest,
        passengerId: 'other-passenger',
      });

      await expect(service.cancelRideRequest(passengerUser, 'request-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('이미 처리된 요청은 취소할 수 없다', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({ ...prismaRequest, status: 'ACCEPTED' });

      await expect(service.cancelRideRequest(passengerUser, 'request-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
