import {
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { CurrentUser } from '../../common/context/graphql-context';
import type { Message, MessageType } from '../../graphql/generated/schema-types';
import { JwtTokenService } from '../auth/jwt-token.service';
import { ChatService } from './chat.service';

type ChatSocket = Omit<Socket, 'data' | 'handshake'> & {
  data: { currentUser?: CurrentUser };
  handshake: Omit<Socket['handshake'], 'auth' | 'headers'> & {
    auth: { token?: unknown };
    headers: { authorization?: string | string[] };
  };
};
type RoomPayload = { readonly roomId: string };
type MessagePayload = RoomPayload & {
  readonly content: string;
  readonly type?: MessageType | null;
};
type Ack<T = undefined> = T extends undefined ? { readonly ok: true } : { readonly ok: true } & T;

const ROOM_PREFIX = 'chat:';
const MESSAGE_WINDOW_MS = 3000;
const MESSAGE_LIMIT = 5;

@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly messageTimestampsBySocket = new Map<string, number[]>();

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly chatService: ChatService,
  ) {}

  handleConnection(socket: ChatSocket): void {
    if (socket.data.currentUser) {
      return;
    }

    const token = this.extractToken(socket);
    if (!token) {
      socket.disconnect(true);
      throw new UnauthorizedException('인증이 필요합니다');
    }

    const payload = this.jwtTokenService.verifyAccessToken(token);
    socket.data.currentUser = {
      id: payload.sub,
      companyId: payload.companyId,
      role: payload.role as CurrentUser['role'],
    };
  }

  @SubscribeMessage('chat:join')
  async joinRoom(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: RoomPayload,
  ): Promise<Ack> {
    const currentUser = this.currentUser(socket);
    try {
      await this.chatService.ensureRoomParticipant(currentUser, payload.roomId);
    } catch (error) {
      throw new WsException(errorMessage(error));
    }
    await socket.join(roomName(payload.roomId));

    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  async leaveRoom(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: RoomPayload,
  ): Promise<Ack> {
    await socket.leave(roomName(payload.roomId));

    return { ok: true };
  }

  @SubscribeMessage('chat:message')
  async sendMessage(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: MessagePayload,
  ): Promise<Ack<{ readonly message: Message }>> {
    const currentUser = this.currentUser(socket);
    this.validateMessagePayload(payload);
    this.assertRateLimit(socket.id);

    let message: Message;
    try {
      message = await this.chatService.createMessage(currentUser, payload);
    } catch (error) {
      throw new WsException(errorMessage(error));
    }
    this.server.to(roomName(payload.roomId)).emit('chat:messageCreated', message);

    return { ok: true, message };
  }

  private currentUser(socket: ChatSocket): CurrentUser {
    if (!socket.data.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return socket.data.currentUser;
  }

  private validateMessagePayload(payload: MessagePayload): void {
    const content = payload.content.trim();
    if (!content) {
      throw new BadRequestException('메시지를 입력해주세요');
    }
    if (content.length > 1000) {
      throw new BadRequestException('메시지는 1000자 이내여야 합니다');
    }
  }

  private assertRateLimit(socketId: string): void {
    const now = Date.now();
    const timestamps = (this.messageTimestampsBySocket.get(socketId) ?? []).filter(
      (timestamp) => now - timestamp < MESSAGE_WINDOW_MS,
    );

    if (timestamps.length >= MESSAGE_LIMIT) {
      throw new HttpException('잠시 후 다시 시도해주세요', HttpStatus.TOO_MANY_REQUESTS);
    }

    timestamps.push(now);
    this.messageTimestampsBySocket.set(socketId, timestamps);
  }

  private extractToken(socket: ChatSocket): string | null {
    const authToken = socket.handshake.auth.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return null;
  }
}

function roomName(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '채팅 요청에 실패했습니다';
}
