import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { MetricsService } from '../metrics/metrics.service';
import { StructuredLoggerService } from './structured-logger.service';

type GraphQLBody = {
  readonly operationName?: string | null;
};

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const route = request.originalUrl || request.path || 'unknown';
      this.metricsService.observeRequest({
        method: request.method,
        route,
        statusCode: response.statusCode,
        durationMs,
      });
      this.logger.log({
        level: response.statusCode >= 500 ? 'error' : 'info',
        message: 'http_request',
        context: {
          method: request.method,
          path: route,
          statusCode: response.statusCode,
          durationMs,
          operationName: operationName(request.body),
        },
      });
    });

    next();
  }
}

function operationName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const graphQLBody = body as GraphQLBody;
  return graphQLBody.operationName ?? null;
}
