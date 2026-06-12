import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  ChatRoom,
  Message,
  MessageConnection,
  MessageType,
  PaginationInput,
  Ride,
  RideRequest,
  User,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const chatRoomInclude = {
  ride: {
    include: {
      driver: true,
      requests: {
        include: {
          passenger: true,
        },
      },
    },
  },
  messages: {
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.ChatRoomInclude;

const messageInclude = {
  sender: true,
} satisfies Prisma.MessageInclude;

type ChatRoomRecord = Prisma.ChatRoomGetPayload<{ include: typeof chatRoomInclude }>;
type MessageRecord = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;
type RideRecord = ChatRoomRecord['ride'];
type RideRequestRecord = RideRecord['requests'][number];
type UserRecord = Prisma.UserGetPayload<object>;

export type CreateChatMessageInput = {
  readonly roomId: string;
  readonly content: string;
  readonly type?: MessageType | null;
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async chatRooms(
    currentUser: CurrentUser,
    pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<ChatRoom>> {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        ride: {
          companyId: currentUser.companyId,
          OR: [
            { driverId: currentUser.id },
            { requests: { some: { passengerId: currentUser.id, status: 'ACCEPTED' } } },
          ],
        },
      },
      include: chatRoomInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: this.pageSize(pagination),
    });

    return rooms.map((room) => this.mapChatRoom(room));
  }

  async messages(
    currentUser: CurrentUser,
    roomId: string,
    pagination: PaginationInput | null,
  ): Promise<MessageConnection> {
    await this.ensureRoomParticipant(currentUser, roomId);

    const first = this.pageSize(pagination);
    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
      },
      cursor: pagination?.after ? { id: pagination.after } : undefined,
      include: messageInclude,
      orderBy: {
        createdAt: 'asc',
      },
      skip: pagination?.after ? 1 : 0,
      take: first + 1,
    });
    const nodes = messages.slice(0, first).map((message) => this.mapMessage(message));

    return {
      nodes,
      pageInfo: {
        hasNextPage: messages.length > first,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    };
  }

  async createMessage(currentUser: CurrentUser, input: CreateChatMessageInput): Promise<Message> {
    const room = await this.ensureRoomParticipant(currentUser, input.roomId);

    if (['COMPLETED', 'CANCELLED'].includes(room.ride.status)) {
      throw new BadRequestException('종료된 카풀에는 메시지를 보낼 수 없습니다');
    }

    const content = input.content.trim();
    if (!content) {
      throw new BadRequestException('메시지를 입력해주세요');
    }
    if (content.length > 1000) {
      throw new BadRequestException('메시지는 1000자 이내여야 합니다');
    }

    const message = await this.prisma.message.create({
      data: {
        roomId: input.roomId,
        senderId: currentUser.id,
        content,
        type: input.type ?? 'TEXT',
      },
      include: messageInclude,
    });

    return this.mapMessage(message);
  }

  async ensureRoomParticipant(currentUser: CurrentUser, roomId: string): Promise<ChatRoomRecord> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: chatRoomInclude,
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }
    if (room.ride.companyId !== currentUser.companyId) {
      throw new ForbiddenException('접근 권한이 없습니다');
    }
    if (!this.isParticipant(currentUser, room)) {
      throw new ForbiddenException('해당 채팅방의 참여자가 아닙니다');
    }

    return room;
  }

  private isParticipant(currentUser: CurrentUser, room: ChatRoomRecord): boolean {
    return (
      room.ride.driverId === currentUser.id ||
      room.ride.requests.some(
        (request) => request.passengerId === currentUser.id && request.status === 'ACCEPTED',
      )
    );
  }

  private pageSize(pagination: PaginationInput | null): number {
    const first = pagination?.first ?? DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
  }

  private mapChatRoom(room: ChatRoomRecord): ChatRoom {
    return {
      id: room.id,
      ride: this.mapRide(room.ride),
      lastMessage: room.messages[0] ? this.mapMessage(room.messages[0]) : null,
      unreadCount: 0,
      createdAt: room.createdAt,
    };
  }

  private mapMessage(message: MessageRecord): Message {
    return {
      id: message.id,
      roomId: message.roomId,
      sender: this.mapUser(message.sender),
      type: message.type,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private mapRide(ride: RideRecord): Ride {
    return {
      id: ride.id,
      companyId: ride.companyId,
      driver: this.mapUser(ride.driver),
      departure: {
        lat: numberValue(ride.departureLat),
        lng: numberValue(ride.departureLng),
      },
      departureAddr: ride.departureAddr,
      arrival: {
        lat: numberValue(ride.arrivalLat),
        lng: numberValue(ride.arrivalLng),
      },
      arrivalAddr: ride.arrivalAddr,
      departureTime: ride.departureTime,
      availableSeats: ride.availableSeats,
      fare: ride.fare,
      preferences: jsonObject(ride.preferences),
      status: ride.status,
      requests: ride.requests.map((request) => this.mapRideRequest(request, ride)),
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };
  }

  private mapRideRequest(request: RideRequestRecord, ride: RideRecord): RideRequest {
    return {
      id: request.id,
      ride: {
        ...this.mapRide({ ...ride, requests: [] }),
        requests: [],
      },
      passenger: this.mapUser(request.passenger),
      pickup:
        request.pickupLat === null || request.pickupLng === null
          ? null
          : {
              lat: numberValue(request.pickupLat),
              lng: numberValue(request.pickupLng),
            },
      pickupAddr: request.pickupAddr,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private mapUser(user: UserRecord): User {
    return {
      id: user.id,
      companyId: user.companyId,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      imageUrl: user.imageUrl,
      provider: user.provider,
      providerId: user.providerId,
      role: user.role,
      rating: numberValue(user.rating),
      rideCount: user.rideCount,
      company: null,
      vehicles: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

function numberValue(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  return value;
}
