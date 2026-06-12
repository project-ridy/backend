import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthServiceModule } from '../auth/auth-service.module';
import { ChatGateway } from './chat.gateway';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule, AuthServiceModule],
  providers: [ChatResolver, ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatServiceModule {}
