import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import { ChatGateway } from './chat.gateway';

type SocketMock = {
  readonly id: string;
  readonly data: { currentUser?: CurrentUser };
  readonly handshake: { auth: Record<string, unknown>; headers: Record<string, unknown> };
  readonly join: jest.Mock;
  readonly leave: jest.Mock;
  readonly disconnect: jest.Mock;
};

const currentUser: CurrentUser = { id: 'passenger-1', companyId: 'company-1', role: 'PASSENGER' };
const message = {
  id: 'message-1',
  roomId: 'room-1',
  sender: {
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
    rating: 4.5,
    rideCount: 3,
    company: null,
    vehicles: [],
    createdAt: new Date('2026-06-12T08:00:00.000Z'),
    updatedAt: new Date('2026-06-12T08:00:00.000Z'),
  },
  type: 'TEXT',
  content: '안녕하세요',
  createdAt: new Date('2026-06-12T08:00:00.000Z'),
};

describe('ChatGateway', () => {
  it('토큰이 없으면 연결을 거부한다', () => {
    const gateway = createGateway();
    const socket = createSocket();

    expect(() => gateway.handleConnection(socket as never)).toThrow(UnauthorizedException);
  });

  it('참여자가 채팅방에 입장한다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    await expect(gateway.joinRoom(socket as never, { roomId: 'room-1' })).resolves.toEqual({
      ok: true,
    });

    expect(socket.join).toHaveBeenCalledWith('chat:room-1');
  });

  it('참여자가 채팅방을 나간다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    await expect(gateway.leaveRoom(socket as never, { roomId: 'room-1' })).resolves.toEqual({
      ok: true,
    });

    expect(socket.leave).toHaveBeenCalledWith('chat:room-1');
  });

  it('메시지를 저장하고 room에 브로드캐스트한다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    await expect(
      gateway.sendMessage(socket as never, {
        roomId: 'room-1',
        content: '안녕하세요',
        type: 'TEXT',
      }),
    ).resolves.toEqual({ ok: true, message });

    const server = gateway.server as unknown as {
      readonly to: jest.Mock;
      readonly emit: jest.Mock;
    };
    expect(server.to).toHaveBeenCalledWith('chat:room-1');
    expect(server.emit).toHaveBeenCalledWith('chat:messageCreated', message);
  });

  it('빈 메시지는 저장하지 않는다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    await expect(
      gateway.sendMessage(socket as never, { roomId: 'room-1', content: ' ', type: 'TEXT' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('1000자를 초과하면 거부한다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    await expect(
      gateway.sendMessage(socket as never, {
        roomId: 'room-1',
        content: 'a'.repeat(1001),
        type: 'TEXT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('3초 내 5회 초과 메시지를 거부한다', async () => {
    const gateway = createGateway();
    const socket = createSocket(currentUser);

    for (let count = 0; count < 5; count += 1) {
      await gateway.sendMessage(socket as never, {
        roomId: 'room-1',
        content: `메시지 ${count}`,
        type: 'TEXT',
      });
    }

    await expect(
      gateway.sendMessage(socket as never, {
        roomId: 'room-1',
        content: '초과 메시지',
        type: 'TEXT',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});

function createGateway(): ChatGateway {
  const gateway = new ChatGateway(
    {
      verifyAccessToken: jest.fn().mockReturnValue({
        sub: currentUser.id,
        companyId: currentUser.companyId,
        role: currentUser.role,
      }),
    } as never,
    {
      ensureRoomParticipant: jest.fn().mockResolvedValue(undefined),
      createMessage: jest.fn().mockResolvedValue(message),
    } as never,
  );
  gateway.server = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as never;

  return gateway;
}

function createSocket(user?: CurrentUser): SocketMock {
  return {
    id: 'socket-1',
    data: user ? { currentUser: user } : {},
    handshake: { auth: {}, headers: {} },
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
  };
}
