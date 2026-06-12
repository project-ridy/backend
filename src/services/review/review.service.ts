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
  CreateReviewInput,
  PaginationInput,
  Review,
  Ride,
  User,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_COMMENT_LENGTH = 1000;

const rideInclude = {
  driver: true,
  requests: {
    include: {
      passenger: true,
    },
  },
} satisfies Prisma.RideInclude;

const reviewInclude = {
  ride: {
    include: rideInclude,
  },
  fromUser: true,
  toUser: true,
} satisfies Prisma.ReviewInclude;

type RideRecord = Prisma.RideGetPayload<{ include: typeof rideInclude }>;
type RideRequestRecord = RideRecord['requests'][number];
type ReviewRecord = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;
type UserRecord = Prisma.UserGetPayload<object>;

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(currentUser: CurrentUser, input: CreateReviewInput): Promise<Review> {
    this.validateRating(input.rating);
    const comment = this.normalizeComment(input.comment);
    const ride = await this.findRide(currentUser, input.rideId);

    if (ride.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 운행에만 리뷰를 작성할 수 있습니다');
    }
    if (!this.isParticipant(currentUser.id, ride)) {
      throw new ForbiddenException('운행 참여자만 리뷰를 작성할 수 있습니다');
    }
    if (input.toUserId === currentUser.id) {
      throw new BadRequestException('자기 자신에게 리뷰를 작성할 수 없습니다');
    }
    if (!this.isParticipant(input.toUserId, ride)) {
      throw new BadRequestException('리뷰 대상자가 운행 참여자가 아닙니다');
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        rideId: input.rideId,
        fromId: currentUser.id,
        toId: input.toUserId,
      },
    });
    if (existingReview) {
      throw new ConflictException('이미 작성한 리뷰입니다');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          rideId: input.rideId,
          fromId: currentUser.id,
          toId: input.toUserId,
          rating: input.rating,
          comment,
        },
        include: reviewInclude,
      });
      const aggregate = await tx.review.aggregate({
        where: { toId: input.toUserId },
        _avg: { rating: true },
      });
      const averageRating = roundToOneDecimal(aggregate._avg.rating ?? input.rating);
      await tx.user.update({
        where: { id: input.toUserId },
        data: { rating: averageRating },
      });

      return created;
    });

    return this.mapReview(review);
  }

  async rideReviews(currentUser: CurrentUser, rideId: string): Promise<ReadonlyArray<Review>> {
    await this.findRide(currentUser, rideId);
    const reviews = await this.prisma.review.findMany({
      where: { rideId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => this.mapReview(review));
  }

  async userReviews(
    currentUser: CurrentUser,
    userId: string,
    pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<Review>> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId: currentUser.companyId },
    });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        toId: userId,
        toUser: { companyId: currentUser.companyId },
      },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: this.pageSize(pagination),
    });

    return reviews.map((review) => this.mapReview(review));
  }

  private async findRide(currentUser: CurrentUser, rideId: string): Promise<RideRecord> {
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, companyId: currentUser.companyId },
      include: rideInclude,
    });
    if (!ride) {
      throw new NotFoundException('운행을 찾을 수 없습니다');
    }

    return ride;
  }

  private validateRating(rating: number): void {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('평점은 1~5 정수여야 합니다');
    }
  }

  private normalizeComment(comment: string | null | undefined): string | null {
    const normalized = comment?.trim() ?? '';
    if (!normalized) {
      return null;
    }
    if (normalized.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException('리뷰 코멘트는 1000자 이내여야 합니다');
    }
    return normalized;
  }

  private isParticipant(userId: string, ride: RideRecord): boolean {
    return (
      ride.driverId === userId ||
      ride.requests.some(
        (request) => request.passengerId === userId && request.status === 'ACCEPTED',
      )
    );
  }

  private pageSize(pagination: PaginationInput | null): number {
    const first = pagination?.first ?? DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
  }

  private mapReview(review: ReviewRecord): Review {
    return {
      id: review.id,
      ride: this.mapRide(review.ride),
      fromUser: this.mapUser(review.fromUser),
      toUser: this.mapUser(review.toUser),
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
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
