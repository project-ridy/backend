import { Module } from '@nestjs/common';

import { InviteCodeModule } from './invite-code/invite-code.module';

@Module({
  imports: [InviteCodeModule],
  exports: [InviteCodeModule],
})
export class CompanyServiceModule {}
