import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';

import { HealthModule } from './modules/health/health.module';
import { InviteCodeModule } from './modules/invite-code/invite-code.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(process.cwd(), 'src/graphql/**/*.graphql')],
      sortSchema: true,
    }),
    PrismaModule,
    HealthModule,
    InviteCodeModule,
  ],
})
export class AppModule {}
