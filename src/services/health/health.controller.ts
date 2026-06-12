import { Controller, Get } from '@nestjs/common';

import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService, LiveHealthResponseDto } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live(): LiveHealthResponseDto {
    return this.healthService.getLive();
  }

  @Get('ready')
  async ready(): Promise<HealthResponseDto> {
    return this.healthService.getReady();
  }
}
