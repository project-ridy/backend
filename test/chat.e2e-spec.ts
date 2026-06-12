import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtTokenService } from '../src/services/auth/jwt-token.service';

type HttpServerWithAddress = {
  readonly address: () => AddressInfo | string | null;
};

type GraphQLResponse<T> = {
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
  readonly data?: T;
};

type ChatRoomsPayload = {
  readonly chatRooms: ReadonlyArray<{
    readonly id: string;
    readonly unreadCount: number;
    readonly ride: { readonly id: string };
    readonly lastMessage: { readonly id: string; readonly content: string } | null;
  }>;
};

type MessagesPayload = {
  readonly messages: {
    readonly nodes: ReadonlyArray<{ readonly id: string; readonly content: string }>;
    readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
  } | null;
};

type ChatAck = {
  readonly ok: true;
  readonly message?: { readonly id: string; readonly content: string; readonly roomId: string };
};

type MockPrismaService = {
  readonly chatRoom: {
    readonly findMany: jest.Mock;
    readonly findUnique: jest.Mock;
  };
  readonly message: {
    readonly findMany: jest.Mock;
    readonly create: jest.Mock;
  };
  readonly $connect: jest.Mock;
  readonly $disconnect: jest.Mock;
};

const CHAT_ROOMS_QUERY = /* GraphQL */ `
  query ChatRooms {
    chatRooms {
      id
      unreadCount
      ride {
        id
      }
      lastMessage {
        id
        content
      }
    }
  }
`;

const MESSAGES_QUERY = /* GraphQL */ `
  query Messages($roomId: ID!, $pagination: PaginationInput) {
    messages(roomId: $roomId, pagination: $pagination) {
      nodes {
        id
        content
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const now = new Date('2026-06-12T08:00:00.000Z');
const driver = {
  id: 'driver-1',
  companyId: 'company-1',
  employeeId: 'D-001',
  email: 'driver@ridy.test',
  name: '차주',
  phone: null,
  imageUrl: null,
  provider: 'GOOGLE',
  providerId: 'driver-google',
  role: 'DRIVER',
  rating: 4.8,
  rideCount: 12,
  createdAt: now,
  updatedAt: now,
};
const passenger = {
  ...driver,
  id: 'passenger-1',
  employeeId: 'P-001',
  email: 'passenger@ridy.test',
  name: '탑승자',
  providerId: 'passenger-google',
  role: 'PASSENGER',
};
const stranger = {
  ...driver,
  id: 'stranger-1',
  employeeId: 'S-001',
  email: 'stranger@ridy.test',
  name: '비참여자',
  providerId: 'stranger-google',
  role: 'PASSENGER',
};
const ride = {
  id: 'ride-1',
  companyId: 'company-1',
  driverId: 'driver-1',
  departureLat: 37.4979,
  departureLng: 127.0276,
  departureAddr: '강남역',
  arrivalLat: 37.2636,
  arrivalLng: 127.0286,
  arrivalAddr: '수원역',
  departureTime: now,
  availableSeats: 1,
  fare: 5000,
  recurringDays: null,
  recurringEnd: null,
  preferences: null,
  status: 'MATCHED',
  createdAt: now,
  updatedAt: now,
  driver,
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
      passenger,
    },
  ],
};
const firstMessage = {
  id: 'message-1',
  roomId: 'room-1',
  senderId: 'driver-1',
  content: '안녕하세요',
  type: 'TEXT',
  createdAt: now,
  sender: driver,
};
const createdMessage = {
  id: 'message-2',
  roomId: 'room-1',
  senderId: 'passenger-1',
  content: '곧 도착합니다',
  type: 'TEXT',
  createdAt: now,
  sender: passenger,
};
const room = {
  id: 'room-1',
  rideId: 'ride-1',
  createdAt: now,
  ride,
  messages: [firstMessage],
};

describe('채팅 API GraphQL + Socket.IO (e2e)', () => {
  let app: INestApplication;
  let jwtTokenService: JwtTokenService;
  let mockPrisma: MockPrismaService;
  let baseUrl: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtTokenService = moduleFixture.get(JwtTokenService);
    await app.listen(0);
    const address = (app.getHttpServer() as HttpServerWithAddress).address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.chatRoom.findMany.mockResolvedValue([room]);
    mockPrisma.chatRoom.findUnique.mockResolvedValue(room);
    mockPrisma.message.findMany.mockResolvedValue([firstMessage]);
    mockPrisma.message.create.mockResolvedValue(createdMessage);
  });

  it('인증 없이는 채팅방을 조회할 수 없다', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').send({
      query: CHAT_ROOMS_QUERY,
    });

    const body = response.body as GraphQLResponse<ChatRoomsPayload>;
    expect(response.status).toBe(200);
    expect(body.errors?.[0]?.message).toMatch(/인증/);
  });

  it('참여자의 채팅방 목록을 조회한다', async () => {
    const body = await postGraphQL<ChatRoomsPayload>(passengerToken(), CHAT_ROOMS_QUERY, {});

    expect(body.errors).toBeUndefined();
    expect(body.data?.chatRooms[0]?.id).toBe('room-1');
    expect(body.data?.chatRooms[0]?.lastMessage?.content).toBe('안녕하세요');
  });

  it('채팅방 메시지 이력을 조회한다', async () => {
    const body = await postGraphQL<MessagesPayload>(passengerToken(), MESSAGES_QUERY, {
      roomId: 'room-1',
      pagination: { first: 20, after: null },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.messages?.nodes[0]?.content).toBe('안녕하세요');
    expect(body.data?.messages?.pageInfo.hasNextPage).toBe(false);
  });

  it('참여자가 채팅방에 입장하고 나간다', async () => {
    const client = await connectChat(passengerToken());

    await expect(emitAck(client, 'chat:join', { roomId: 'room-1' })).resolves.toEqual({ ok: true });
    await expect(emitAck(client, 'chat:leave', { roomId: 'room-1' })).resolves.toEqual({
      ok: true,
    });

    client.close();
  });

  it('메시지를 저장하고 같은 방 참여자에게 브로드캐스트한다', async () => {
    const sender = await connectChat(passengerToken());
    const receiver = await connectChat(driverToken());
    await emitAck(sender, 'chat:join', { roomId: 'room-1' });
    await emitAck(receiver, 'chat:join', { roomId: 'room-1' });

    const messageCreated = once<{ readonly content: string }>(receiver, 'chat:messageCreated');
    const ack = await emitAck(sender, 'chat:message', {
      roomId: 'room-1',
      content: '곧 도착합니다',
      type: 'TEXT',
    });

    expect(ack.ok).toBe(true);
    expect(ack.message?.content).toBe('곧 도착합니다');
    await expect(messageCreated).resolves.toMatchObject({ content: '곧 도착합니다' });
    const createMessageArg = firstMockArg<{
      readonly data: { readonly roomId: string; readonly senderId: string };
    }>(mockPrisma.message.create);
    expect(createMessageArg.data).toMatchObject({ roomId: 'room-1', senderId: 'passenger-1' });

    sender.close();
    receiver.close();
  });

  it('비참여자는 채팅방에 입장할 수 없다', async () => {
    const client = await connectChat(strangerToken());

    await expect(emitAck(client, 'chat:join', { roomId: 'room-1' })).rejects.toThrow(/참여자/);

    client.close();
  });

  it('오프라인 상대도 저장된 메시지를 이력으로 조회한다', async () => {
    mockPrisma.message.findMany.mockResolvedValue([firstMessage, createdMessage]);

    const sender = await connectChat(passengerToken());
    await emitAck(sender, 'chat:join', { roomId: 'room-1' });
    await emitAck(sender, 'chat:message', {
      roomId: 'room-1',
      content: '곧 도착합니다',
      type: 'TEXT',
    });
    sender.close();

    const body = await postGraphQL<MessagesPayload>(driverToken(), MESSAGES_QUERY, {
      roomId: 'room-1',
      pagination: { first: 20, after: null },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.messages?.nodes.map((message) => message.content)).toContain('곧 도착합니다');
  });

  async function postGraphQL<T>(
    token: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });

    expect(response.status).toBe(200);
    return response.body as GraphQLResponse<T>;
  }

  function driverToken(): string {
    return issueToken(driver.id, driver.role, driver.email);
  }

  function passengerToken(): string {
    return issueToken(passenger.id, passenger.role, passenger.email);
  }

  function strangerToken(): string {
    return issueToken(stranger.id, stranger.role, stranger.email);
  }

  function issueToken(sub: string, role: string, email: string): string {
    return jwtTokenService.issueTokenPair({
      sub,
      companyId: 'company-1',
      role,
      email,
    }).accessToken;
  }

  async function connectChat(token: string): Promise<Socket> {
    const client = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    await once(client, 'connect');
    return client;
  }
});

function createMockPrisma(): MockPrismaService {
  return {
    chatRoom: {
      findMany: jest.fn().mockResolvedValue([room]),
      findUnique: jest.fn().mockResolvedValue(room),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([firstMessage]),
      create: jest.fn().mockResolvedValue(createdMessage),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

function once<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} timeout`)), 2000);
    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once('exception', (error: ErrorLike) => {
      clearTimeout(timeout);
      reject(new Error(error.message));
    });
  });
}

function emitAck(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
): Promise<ChatAck> {
  return new Promise((resolve, reject) => {
    socket.timeout(2000).emit(event, payload, (error: Error | null, response?: ChatAck) => {
      if (error) {
        reject(error);
        return;
      }
      if (!response?.ok) {
        reject(new Error('ack failed'));
        return;
      }

      resolve(response);
    });
    socket.once('exception', (error: ErrorLike) => reject(new Error(error.message)));
  });
}

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

type ErrorLike = {
  readonly message: string;
};
