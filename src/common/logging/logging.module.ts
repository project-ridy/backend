import { Module } from '@nestjs/common';

import { MetricsModule } from '../metrics/metrics.module';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { StructuredLoggerService } from './structured-logger.service';

@Module({
  imports: [MetricsModule],
  providers: [RequestLoggingMiddleware, StructuredLoggerService],
  exports: [RequestLoggingMiddleware, StructuredLoggerService],
})
export class LoggingModule {}
