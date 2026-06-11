import { Module } from '@nestjs/common';

import { InviteCodeResolver } from './invite-code.resolver';
import { InviteCodeService } from './invite-code.service';

@Module({
  providers: [InviteCodeResolver, InviteCodeService],
  exports: [InviteCodeService],
})
export class InviteCodeModule {}
