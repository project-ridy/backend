import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventsModule } from '../common/events/events.module';
import { LoggingModule } from '../common/logging/logging.module';
import { RequestLoggingMiddleware } from '../common/logging/request-logging.middleware';
import { MetricsModule } from '../common/metrics/metrics.module';
import { GraphQLGatewayModule } from '../gateway/graphql/graphql-gateway.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsServiceModule } from '../services/analytics/analytics-service.module';
import { AuthServiceModule } from '../services/auth/auth-service.module';
import { ChatServiceModule } from '../services/chat/chat-service.module';
import { CompanyServiceModule } from '../services/company/company-service.module';
import { HealthModule } from '../services/health/health.module';
import { MatchingServiceModule } from '../services/matching/matching-service.module';
import { NotificationServiceModule } from '../services/notification/notification-service.module';
import { PaymentServiceModule } from '../services/payment/payment-service.module';
import { ReviewServiceModule } from '../services/review/review-service.module';
import { UserModule } from '../services/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventsModule,
    MetricsModule,
    LoggingModule,
    GraphQLGatewayModule,
    AuthServiceModule,
    CompanyServiceModule,
    MatchingServiceModule,
    ChatServiceModule,
    PaymentServiceModule,
    ReviewServiceModule,
    AnalyticsServiceModule,
    NotificationServiceModule,
    UserModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware)
      .exclude({ path: 'metrics', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
