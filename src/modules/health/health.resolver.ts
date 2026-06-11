import { Query, Resolver } from '@nestjs/graphql';

import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@Resolver(() => HealthResponseDto)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => HealthResponseDto, {
    description: 'Ridy 백엔드 서비스 상태를 확인합니다.',
  })
  health(): HealthResponseDto {
    return this.healthService.getHealth();
  }
}
