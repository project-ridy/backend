import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { GraphQLContext } from '../../common/context/graphql-context';
import type {
  AuthPayload,
  JoinWithInviteCodeInput,
  LoginInput,
  User,
} from '../../graphql/generated/schema-types';
import { AuthService } from './auth.service';

@Resolver('Auth')
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation('login')
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  @Mutation('joinWithInviteCode')
  async joinWithInviteCode(@Args('input') input: JoinWithInviteCodeInput): Promise<AuthPayload> {
    return this.authService.joinWithInviteCode(input);
  }

  @Mutation('refreshToken')
  async refreshToken(@Args('token') token: string): Promise<AuthPayload> {
    return this.authService.refreshToken(token);
  }

  @Query('me')
  async me(@Context() context: GraphQLContext): Promise<User> {
    return this.authService.currentUserFromAccessToken(context.authToken);
  }
}
