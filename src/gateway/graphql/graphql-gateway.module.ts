import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import type { GraphQLContext } from '../../common/context/graphql-context';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(process.cwd(), 'src/graphql/**/*.graphql')],
      sortSchema: true,
      context: ({ req }: GraphQLContextFactoryArgs): GraphQLContext => ({
        requestId: headerValue(req?.headers['x-request-id']) ?? randomUUID(),
        currentUser: undefined,
        authToken: headerValue(req?.headers.authorization),
      }),
    }),
  ],
})
export class GraphQLGatewayModule {}
