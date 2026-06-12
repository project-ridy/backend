import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import type { CurrentUser, GraphQLContext } from '../../common/context/graphql-context';
import type {
  ChatRoom,
  MessageConnection,
  PaginationInput,
} from '../../graphql/generated/schema-types';
import { ChatService } from './chat.service';

@Resolver('ChatRoom')
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  @Query('chatRooms')
  async chatRooms(
    @Context() context: GraphQLContext,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<ChatRoom>> {
    return this.chatService.chatRooms(this.currentUser(context), pagination);
  }

  @Query('messages')
  async messages(
    @Context() context: GraphQLContext,
    @Args('roomId') roomId: string,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<MessageConnection> {
    return this.chatService.messages(this.currentUser(context), roomId, pagination);
  }

  private currentUser(context: GraphQLContext): CurrentUser {
    if (!context.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return context.currentUser;
  }
}
