import { Query, Resolver } from '@nestjs/graphql';

import type { Health } from '../../graphql/generated/schema-types';
import { HealthService } from './health.service';

@Resolver('Health')
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query('health')
  health(): Health {
    return this.healthService.getHealth();
  }
}
