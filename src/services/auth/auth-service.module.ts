import { Module } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtTokenService, JWT_SECRET } from './jwt-token.service';
import { MockableSocialOAuthVerifier } from './social-oauth.verifier';

@Module({
  providers: [
    AuthResolver,
    AuthService,
    JwtTokenService,
    {
      provide: JWT_SECRET,
      useValue: process.env.JWT_SECRET ?? 'ridy-dev-secret',
    },
    MockableSocialOAuthVerifier,
    AuthGuard,
  ],
  exports: [AuthService, JwtTokenService, AuthGuard],
})
export class AuthServiceModule {}
