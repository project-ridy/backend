import { Module } from '@nestjs/common';

import { MatchingResolver } from './matching.resolver';
import { MatchingService } from './matching.service';

@Module({
  providers: [MatchingResolver, MatchingService],
  exports: [MatchingService],
})
export class MatchingServiceModule {}
