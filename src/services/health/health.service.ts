import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

export type LiveHealthResponseDto = {
  readonly status: string;
  readonly service: string;
  readonly uptimeSec: number;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponseDto> {
    const database = await this.checkDatabase();
    const redis = {
      status: 'disabled',
      latencyMs: null,
      message: 'Redis client is not configured',
    };

    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      service: 'ridy-backend',
      database,
      redis,
      uptimeSec: uptimeSec(),
      timestamp: new Date(),
    };
  }

  getLive(): LiveHealthResponseDto {
    return {
      status: 'ok',
      service: 'ridy-backend',
      uptimeSec: uptimeSec(),
    };
  }

  async getReady(): Promise<HealthResponseDto> {
    return this.getHealth();
  }

  private async checkDatabase(): Promise<HealthResponseDto['database']> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1 as healthcheck`;
      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        message: null,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Database healthcheck failed',
      };
    }
  }
}

function uptimeSec(): number {
  return Math.floor(process.uptime());
}
