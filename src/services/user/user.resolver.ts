import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { GraphQLContext } from '../../common/context/graphql-context';
import type {
  RegisterVehicleInput,
  UpdateProfileInput,
  UpdateVehicleInput,
  User,
  Vehicle,
} from '../../graphql/generated/schema-types';
import { UserService } from './user.service';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation('updateProfile')
  async updateProfile(
    @Context() context: GraphQLContext,
    @Args('input') input: UpdateProfileInput,
  ): Promise<User> {
    const userId = context.currentUser!.id;
    return this.userService.updateProfile(userId, input) as unknown as Promise<User>;
  }

  @Mutation('registerVehicle')
  async registerVehicle(
    @Context() context: GraphQLContext,
    @Args('input') input: RegisterVehicleInput,
  ): Promise<Vehicle> {
    const userId = context.currentUser!.id;
    return this.userService.registerVehicle(userId, input);
  }

  @Mutation('updateVehicle')
  async updateVehicle(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
    @Args('input') input: UpdateVehicleInput,
  ): Promise<Vehicle> {
    const userId = context.currentUser!.id;
    return this.userService.updateVehicle(userId, id, input);
  }

  @Mutation('deleteVehicle')
  async deleteVehicle(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<boolean> {
    const userId = context.currentUser!.id;
    return this.userService.deleteVehicle(userId, id);
  }

  @Query('myVehicles')
  async myVehicles(@Context() context: GraphQLContext): Promise<ReadonlyArray<Vehicle>> {
    const userId = context.currentUser!.id;
    return this.userService.myVehicles(userId);
  }
}
