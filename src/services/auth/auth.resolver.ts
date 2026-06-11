import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { GraphQLContext } from '../../common/context/graphql-context';
import type {
  AuthPayload,
  JoinWithInviteCodeInput,
  LoginInput,
  PhoneVerificationCodePayload,
  PhoneVerificationPayload,
  SendPhoneVerificationCodeInput,
  User,
  VerifyPhoneCodeInput,
} from '../../graphql/generated/schema-types';
import { AuthService } from './auth.service';
import { PhoneVerificationService } from './phone-verification.service';

@Resolver('Auth')
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

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

  @Mutation('sendPhoneVerificationCode')
  async sendPhoneVerificationCode(
    @Args('input') input: SendPhoneVerificationCodeInput,
    @Context() context: GraphQLContext,
  ): Promise<PhoneVerificationCodePayload> {
    return this.phoneVerificationService.sendVerificationCode(context.currentUser, input);
  }

  @Mutation('verifyPhoneCode')
  async verifyPhoneCode(
    @Args('input') input: VerifyPhoneCodeInput,
    @Context() context: GraphQLContext,
  ): Promise<PhoneVerificationPayload> {
    return this.phoneVerificationService.verifyPhoneCode(context.currentUser, input);
  }

  @Query('me')
  async me(@Context() context: GraphQLContext): Promise<User> {
    return this.authService.currentUserFromAccessToken(context.authToken);
  }
}
