import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import type { CreateReviewInput } from '../../graphql/generated/schema-types';
import { ReviewService } from './review.service';

type MockPrisma = {
  ride: {
    findFirst: jest.Mock;
  };
  review: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    aggregate: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const now = new Date('2026-06-12T00:00:00.000Z');

const passengerUser: CurrentUser = {
  id: 'passenger-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const strangerUser: CurrentUser = {
  id: 'stranger-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const input: CreateReviewInput = {
  rideId: 'ride-1',
  toUserId: 'driver-1',
  rating: 5,
  comment: '좋은 운행이었어요',
};

const prismaPassenger = {
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
  rating: 4.0,
  rideCount: 3,
  createdAt: now,
  updatedAt: now,
};

const prismaDriver = {
  ...prismaPassenger,
  id: 'driver-1',
  email: 'driver@company.com',
  name: '박차주',
  role: 'DRIVER',
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
  departureTime: now,
  availableSeats: 3,
  fare: 5000,
  recurringDays: null,
  recurringEnd: null,
  preferences: null,
  status: 'COMPLETED',
  createdAt: now,
  updatedAt: now,
  driver: prismaDriver,
  requests: [
    {
      id: 'request-1',
      rideId: 'ride-1',
      passengerId: 'passenger-1',
      pickupLat: null,
      pickupLng: null,
      pickupAddr: null,
      message: null,
      status: 'ACCEPTED',
      createdAt: now,
      updatedAt: now,
      passenger: prismaPassenger,
    },
  ],
};

const prismaReview = {
  id: 'review-1',
  rideId: 'ride-1',
  fromId: 'passenger-1',
  toId: 'driver-1',
  rating: 5,
  comment: '좋은 운행이었어요',
  createdAt: now,
  ride: prismaRide,
  fromUser: prismaPassenger,
  toUser: prismaDriver,
};

describe('ReviewService', () => {
  let prisma: MockPrisma;
  let service: ReviewService;

  beforeEach(() => {
    prisma = {
      ride: {
        findFirst: jest.fn(),
      },
      review: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: MockPrisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    service = new ReviewService(prisma as never);
  });

  describe('createReview', () => {
    it('탑승자가 완료 운행의 차주를 리뷰한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(prismaReview);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 } });

      const result = await service.createReview(passengerUser, input);

      expect(result.id).toBe('review-1');
      expect(result.toUser.id).toBe('driver-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'driver-1' },
        data: { rating: 4.7 },
      });
    });

    it('평점 범위를 검증한다', async () => {
      await expect(
        service.createReview(passengerUser, { ...input, rating: 6 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('완료되지 않은 운행 리뷰를 거부한다', async () => {
      prisma.ride.findFirst.mockResolvedValue({ ...prismaRide, status: 'IN_PROGRESS' });

      await expect(service.createReview(passengerUser, input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('비참여자 리뷰 작성을 거부한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);

      await expect(service.createReview(strangerUser, input)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('운행 참여자가 아닌 대상 리뷰를 거부한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);

      await expect(
        service.createReview(passengerUser, { ...input, toUserId: 'stranger-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('중복 리뷰를 거부한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.review.findFirst.mockResolvedValue(prismaReview);

      await expect(service.createReview(passengerUser, input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('공백 코멘트를 null로 저장한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ ...prismaReview, comment: null });
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 } });

      await service.createReview(passengerUser, { ...input, comment: '   ' });

      const createCall = firstMockArg<{ data: { comment: string | null } }>(prisma.review.create);
      expect(createCall.data.comment).toBeNull();
    });
  });

  describe('rideReviews', () => {
    it('운행 리뷰 목록을 조회한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(prismaRide);
      prisma.review.findMany.mockResolvedValue([prismaReview]);

      const result = await service.rideReviews(passengerUser, 'ride-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.ride.id).toBe('ride-1');
    });

    it('타회사 운행 리뷰 조회를 거부한다', async () => {
      prisma.ride.findFirst.mockResolvedValue(null);

      await expect(service.rideReviews(passengerUser, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('userReviews', () => {
    it('유저가 받은 리뷰 목록을 조회한다', async () => {
      prisma.user.findFirst.mockResolvedValue(prismaDriver);
      prisma.review.findMany.mockResolvedValue([prismaReview]);

      const result = await service.userReviews(passengerUser, 'driver-1', {
        first: 10,
        after: null,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.toUser.id).toBe('driver-1');
    });
  });
});
