import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { CurrentUser, GraphQLContext } from '../../common/context/graphql-context';
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
} from '../../graphql/generated/schema-types';
import { MatchingService } from './matching.service';

@Resolver('Ride')
export class MatchingResolver {
  constructor(private readonly matchingService: MatchingService) {}

  @Query('searchRides')
  async searchRides(
    @Context() context: GraphQLContext,
    @Args('input') input: SearchRidesInput,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<RideConnection> {
    return this.matchingService.searchRides(this.currentUser(context), input, pagination);
  }

  @Query('ride')
  async ride(@Context() context: GraphQLContext, @Args('id') id: string): Promise<Ride> {
    return this.matchingService.ride(this.currentUser(context), id);
  }

  @Query('myRides')
  async myRides(
    @Context() context: GraphQLContext,
    @Args('status') status: RideStatus | null,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<RideConnection> {
    return this.matchingService.myRides(this.currentUser(context), status, pagination);
  }

  @Query('myRideRequests')
  async myRideRequests(
    @Context() context: GraphQLContext,
    @Args('status') status: RequestStatus | null,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<RideRequest>> {
    return this.matchingService.myRideRequests(this.currentUser(context), status, pagination);
  }

  @Mutation('createRide')
  async createRide(
    @Context() context: GraphQLContext,
    @Args('input') input: CreateRideInput,
  ): Promise<Ride> {
    return this.matchingService.createRide(this.currentUser(context), input);
  }

  @Mutation('updateRide')
  async updateRide(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
    @Args('input') input: CreateRideInput,
  ): Promise<Ride> {
    return this.matchingService.updateRide(this.currentUser(context), id, input);
  }

  @Mutation('cancelRide')
  async cancelRide(@Context() context: GraphQLContext, @Args('id') id: string): Promise<Ride> {
    return this.matchingService.cancelRide(this.currentUser(context), id);
  }

  @Mutation('requestRide')
  async requestRide(
    @Context() context: GraphQLContext,
    @Args('input') input: RequestRideInput,
  ): Promise<RideRequest> {
    return this.matchingService.requestRide(this.currentUser(context), input);
  }

  @Mutation('acceptRideRequest')
  async acceptRideRequest(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<RideRequest> {
    return this.matchingService.acceptRideRequest(this.currentUser(context), id);
  }

  @Mutation('rejectRideRequest')
  async rejectRideRequest(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<RideRequest> {
    return this.matchingService.rejectRideRequest(this.currentUser(context), id);
  }

  @Mutation('cancelRideRequest')
  async cancelRideRequest(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<RideRequest> {
    return this.matchingService.cancelRideRequest(this.currentUser(context), id);
  }

  private currentUser(context: GraphQLContext): CurrentUser {
    if (!context.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return context.currentUser;
  }
}
