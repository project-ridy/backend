import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import { ChatService } from './chat.service';

type PrismaMock = {
  readonly chatRoom: {
    readonly findMany: jest.Mock;
    readonly findUnique: jest.Mock;
  };
  readonly message: {
    readonly findMany: jest.Mock;
    readonly create: jest.Mock;
  };
};

const now = new Date('2026-06-12T08:00:00.000Z');
const currentUser: CurrentUser = { id: 'passenger-1', companyId: 'company-1', role: 'PASSENGER' };
const driverUser = {
  id: 'driver-1',
  companyId: 'company-1',
  employeeId: null,
  email: 'driver@ridy.test',
  name: '차주',
  phone: null,
  imageUrl: null,
  provider: 'GOOGLE',
  providerId: 'driver-provider',
  role: 'DRIVER',
  rating: { toNumber: () => 4.8 },
  rideCount: 12,
  createdAt: now,
  updatedAt: now,
};
const passengerUser = {
  id: 'passenger-1',
  companyId: 'company-1',
  employeeId: null,
  email: 'passenger@ridy.test',
  name: '탑승자',
  phone: null,
  imageUrl: null,
  provider: 'GOOGLE',
  providerId: 'passenger-provider',
  role: 'PASSENGER',
  rating: { toNumber: () => 4.5 },
  rideCount: 3,
  createdAt: now,
  updatedAt: now,
};
const ride = {
  id: 'ride-1',
  companyId: 'company-1',
  driverId: 'driver-1',
  departureLat: { toNumber: () => 37.1 },
  departureLng: { toNumber: () => 127.1 },
  departureAddr: '강남역',
  arrivalLat: { toNumber: () => 37.2 },
  arrivalLng: { toNumber: () => 127.2 },
  arrivalAddr: '판교역',
  departureTime: now,
  availableSeats: 1,
  fare: 5000,
  recurringDays: null,
  recurringEnd: null,
  preferences: null,
  status: 'MATCHED',
  createdAt: now,
  updatedAt: now,
  driver: driverUser,
  requests: [
    {
      id: 'request-1',
      rideId: 'ride-1',
      passengerId: 'passenger-1',
      pickupLat: null,
      pickupLng: null,
      pickupAddr: null,
      message: null,
      status: 'ACCEPTED',
      createdAt: now,
      updatedAt: now,
      passenger: passengerUser,
    },
  ],
};
const room = {
  id: 'room-1',
  rideId: 'ride-1',
  createdAt: now,
  ride,
  messages: [
    {
      id: 'message-1',
      roomId: 'room-1',
      senderId: 'driver-1',
      content: '안녕하세요',
      type: 'TEXT',
      createdAt: now,
      sender: driverUser,
    },
  ],
};

describe('ChatService', () => {
  it('내 채팅방 목록을 최신 메시지 기준으로 조회한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findMany.mockResolvedValue([room]);
    const service = new ChatService(prisma as never);

    const result = await service.chatRooms(currentUser, { first: 20, after: null });

    const findManyArg = firstMockArg<{
      readonly where: { readonly ride: { readonly companyId: string } };
    }>(prisma.chatRoom.findMany);
    expect(findManyArg.where.ride.companyId).toBe('company-1');
    expect(result[0]?.id).toBe('room-1');
    expect(result[0]?.lastMessage?.content).toBe('안녕하세요');
    expect(result[0]?.unreadCount).toBe(0);
  });

  it('채팅방 메시지를 페이지네이션으로 조회한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue(room);
    prisma.message.findMany.mockResolvedValue([
      ...room.messages,
      createMessage('message-2', '곧 도착합니다'),
    ]);
    const service = new ChatService(prisma as never);

    const result = await service.messages(currentUser, 'room-1', { first: 1, after: null });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.content).toBe('안녕하세요');
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.endCursor).toBe('message-1');
  });

  it('타회사 채팅방 접근을 거부한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue({
      ...room,
      ride: { ...ride, companyId: 'company-2' },
    });
    const service = new ChatService(prisma as never);

    await expect(service.messages(currentUser, 'room-1', null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('비참여자 채팅방 접근을 거부한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue({ ...room, ride: { ...ride, requests: [] } });
    const service = new ChatService(prisma as never);

    await expect(service.messages(currentUser, 'room-1', null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('채팅방이 없으면 빈 배열을 반환한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findMany.mockResolvedValue([]);
    const service = new ChatService(prisma as never);

    await expect(service.chatRooms(currentUser, null)).resolves.toEqual([]);
  });

  it('메시지가 없으면 빈 connection을 반환한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue({ ...room, messages: [] });
    prisma.message.findMany.mockResolvedValue([]);
    const service = new ChatService(prisma as never);

    await expect(service.messages(currentUser, 'room-1', null)).resolves.toEqual({
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
  });

  it('메시지를 저장한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue(room);
    prisma.message.create.mockResolvedValue(createMessage('message-2', '곧 도착합니다'));
    const service = new ChatService(prisma as never);

    const result = await service.createMessage(currentUser, {
      roomId: 'room-1',
      content: '곧 도착합니다',
      type: 'TEXT',
    });

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { roomId: 'room-1', senderId: 'passenger-1', content: '곧 도착합니다', type: 'TEXT' },
      }),
    );
    expect(result.content).toBe('곧 도착합니다');
  });

  it('종료된 카풀에는 메시지를 보낼 수 없다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue({
      ...room,
      ride: { ...ride, status: 'COMPLETED' },
    });
    const service = new ChatService(prisma as never);

    await expect(
      service.createMessage(currentUser, { roomId: 'room-1', content: '안녕하세요', type: 'TEXT' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('없는 채팅방 접근은 NotFound로 처리한다', async () => {
    const prisma = createPrismaMock();
    prisma.chatRoom.findUnique.mockResolvedValue(null);
    const service = new ChatService(prisma as never);

    await expect(service.messages(currentUser, 'missing-room', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createPrismaMock(): PrismaMock {
  return {
    chatRoom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
}

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

function createMessage(id: string, content: string) {
  return {
    id,
    roomId: 'room-1',
    senderId: 'passenger-1',
    content,
    type: 'TEXT',
    createdAt: now,
    sender: passengerUser,
  };
}
