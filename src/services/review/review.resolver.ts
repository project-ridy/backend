import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { CurrentUser, GraphQLContext } from '../../common/context/graphql-context';
import type {
  CreateReviewInput,
  PaginationInput,
  Review,
} from '../../graphql/generated/schema-types';
import { ReviewService } from './review.service';

@Resolver('Review')
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Query('rideReviews')
  async rideReviews(
    @Context() context: GraphQLContext,
    @Args('rideId') rideId: string,
  ): Promise<ReadonlyArray<Review>> {
    return this.reviewService.rideReviews(this.currentUser(context), rideId);
  }

  @Query('userReviews')
  async userReviews(
    @Context() context: GraphQLContext,
    @Args('userId') userId: string,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<Review>> {
    return this.reviewService.userReviews(this.currentUser(context), userId, pagination);
  }

  @Mutation('createReview')
  async createReview(
    @Context() context: GraphQLContext,
    @Args('input') input: CreateReviewInput,
  ): Promise<Review> {
    return this.reviewService.createReview(this.currentUser(context), input);
  }

  private currentUser(context: GraphQLContext): CurrentUser {
    if (!context.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return context.currentUser;
  }
}
