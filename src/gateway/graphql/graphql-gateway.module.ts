import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import type { CurrentUser, GraphQLContext } from '../../common/context/graphql-context';
import { AuthServiceModule } from '../../services/auth/auth-service.module';
import { JwtTokenService } from '../../services/auth/jwt-token.service';

type GraphQLContextFactoryArgs = {
  readonly req?: Request;
};

function headerValue(value: string | string[] | readonly string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0] ?? null;
}

@Module({
  imports: [
    AuthServiceModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthServiceModule],
      inject: [JwtTokenService],
      useFactory: (jwtTokenService: JwtTokenService): ApolloDriverConfig => ({
        typePaths: [join(process.cwd(), 'src/graphql/**/*.graphql')],
        sortSchema: true,
        context: ({ req }: GraphQLContextFactoryArgs): GraphQLContext => {
          const authToken = headerValue(req?.headers.authorization);

          return {
            requestId: headerValue(req?.headers['x-request-id']) ?? randomUUID(),
            currentUser: currentUserFromAuthToken(jwtTokenService, authToken),
            authToken,
          };
        },
      }),
    }),
  ],
})
export class GraphQLGatewayModule {}

function currentUserFromAuthToken(
  jwtTokenService: JwtTokenService,
  authToken: string | null,
): CurrentUser | undefined {
  if (!authToken) {
    return undefined;
  }

  const payload = jwtTokenService.verifyAccessToken(stripBearerPrefix(authToken));

  return {
    id: payload.sub,
    companyId: payload.companyId,
    role: currentUserRole(payload.role),
  };
}

function currentUserRole(role: string): CurrentUser['role'] {
  if (role === 'PASSENGER' || role === 'DRIVER' || role === 'BOTH' || role === 'ADMIN') {
    return role;
  }

  return 'PASSENGER';
}

function stripBearerPrefix(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}
