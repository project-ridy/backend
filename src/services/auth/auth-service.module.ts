import { Module } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtTokenService, JWT_SECRET } from './jwt-token.service';
import {
  generateSixDigitCode,
  PHONE_CODE_GENERATOR,
  PhoneVerificationService,
  SMS_SENDER,
} from './phone-verification.service';
import { MockableSocialOAuthVerifier } from './social-oauth.verifier';
import { ConsoleSmsSender } from './sms.sender';

@Module({
  providers: [
    AuthResolver,
    AuthService,
    PhoneVerificationService,
    JwtTokenService,
    {
      provide: JWT_SECRET,
      useValue: process.env.JWT_SECRET ?? 'ridy-dev-secret',
    },
    {
      provide: SMS_SENDER,
      useClass: ConsoleSmsSender,
    },
    {
      provide: PHONE_CODE_GENERATOR,
      useValue: generateSixDigitCode,
    },
    MockableSocialOAuthVerifier,
    AuthGuard,
  ],
  exports: [AuthService, PhoneVerificationService, JwtTokenService, AuthGuard],
})
export class AuthServiceModule {}
