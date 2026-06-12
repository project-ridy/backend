import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { JwtTokenService } from '../src/services/auth/jwt-token.service';
import { PrismaService } from '../src/prisma/prisma.service';

type GraphQLResponse<T> = {
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
  readonly data?: T;
};

type CreateRidePayload = {
  readonly createRide: {
    readonly id: string;
    readonly availableSeats: number;
    readonly departure: { readonly lat: number; readonly lng: number };
    readonly driver: { readonly id: string };
  };
};

type SearchRidesPayload = {
  readonly searchRides: {
    readonly totalCount: number;
    readonly nodes: ReadonlyArray<{ readonly id: string; readonly availableSeats: number }>;
  };
};

type RequestRidePayload = {
  readonly requestRide: {
    readonly id: string;
    readonly status: string;
    readonly pickup: { readonly lat: number; readonly lng: number } | null;
  };
};

type AcceptRideRequestPayload = {
  readonly acceptRideRequest: {
    readonly id: string;
    readonly status: string;
    readonly ride: { readonly id: string };
  };
};

type MockPrismaService = {
  readonly ride: {
    readonly create: jest.Mock;
    readonly findMany: jest.Mock;
    readonly findUnique: jest.Mock;
    readonly findFirst: jest.Mock;
    readonly update: jest.Mock;
  };
  readonly rideRequest: {
    readonly create: jest.Mock;
    readonly findFirst: jest.Mock;
    readonly findUnique: jest.Mock;
    readonly findMany: jest.Mock;
    readonly update: jest.Mock;
  };
  readonly $transaction: jest.Mock;
  readonly $connect: jest.Mock;
  readonly $disconnect: jest.Mock;
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const CREATE_RIDE_MUTATION = /* GraphQL */ `
  mutation CreateRide($input: CreateRideInput!) {
    createRide(input: $input) {
      id
      availableSeats
      departure {
        lat
        lng
      }
      driver {
        id
      }
    }
  }
`;

const SEARCH_RIDES_QUERY = /* GraphQL */ `
  query SearchRides($input: SearchRidesInput!) {
    searchRides(input: $input) {
      totalCount
      nodes {
        id
        availableSeats
      }
    }
  }
`;

const REQUEST_RIDE_MUTATION = /* GraphQL */ `
  mutation RequestRide($input: RequestRideInput!) {
    requestRide(input: $input) {
      id
      status
      pickup {
        lat
        lng
      }
    }
  }
`;

const ACCEPT_RIDE_REQUEST_MUTATION = /* GraphQL */ `
  mutation AcceptRideRequest($id: ID!) {
    acceptRideRequest(id: $id) {
      id
      status
      ride {
        id
      }
    }
  }
`;

const now = new Date('2026-06-12T00:00:00.000Z');
const future = new Date('2026-06-12T08:30:00.000Z');

const driver = {
  id: 'driver-1',
  companyId: 'company-1',
  employeeId: 'D-001',
  email: 'driver@ridy.test',
  name: '차주',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO',
  providerId: 'driver-kakao',
  role: 'DRIVER',
  rating: 4.9,
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
  providerId: 'passenger-kakao',
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
  departureTime: future,
  availableSeats: 3,
  fare: 5000,
  recurringDays: null,
  recurringEnd: null,
  preferences: { noSmoking: true },
  status: 'OPEN',
  createdAt: now,
  updatedAt: now,
  driver,
  requests: [],
};

const rideRequest = {
  id: 'request-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  pickupLat: 37.49,
  pickupLng: 127.02,
  pickupAddr: '강남역 1번 출구',
  message: '문 앞에서 탈게요',
  status: 'PENDING',
  createdAt: now,
  updatedAt: now,
  ride,
  passenger,
};

function createMockPrisma(): MockPrismaService {
  const prisma: MockPrismaService = {
    ride: {
      create: jest.fn().mockResolvedValue(ride),
      findMany: jest.fn().mockResolvedValue([ride]),
      findUnique: jest.fn().mockResolvedValue(ride),
      findFirst: jest.fn().mockResolvedValue(ride),
      update: jest.fn().mockResolvedValue({ ...ride, availableSeats: 2 }),
    },
    rideRequest: {
      create: jest.fn().mockResolvedValue(rideRequest),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(rideRequest),
      findMany: jest.fn().mockResolvedValue([rideRequest]),
      update: jest.fn().mockResolvedValue({ ...rideRequest, status: 'ACCEPTED' }),
    },
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  prisma.$transaction.mockImplementation(async (cb: (tx: MockPrismaService) => Promise<unknown>) =>
    cb(prisma),
  );
  return prisma;
}

describe('매칭 API GraphQL (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;
  let jwtTokenService: JwtTokenService;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtTokenService = moduleFixture.get(JwtTokenService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ride.create.mockResolvedValue(ride);
    mockPrisma.ride.findMany.mockResolvedValue([ride]);
    mockPrisma.ride.findUnique.mockResolvedValue(ride);
    mockPrisma.ride.findFirst.mockResolvedValue(ride);
    mockPrisma.ride.update.mockResolvedValue({ ...ride, availableSeats: 2 });
    mockPrisma.rideRequest.findFirst.mockResolvedValue(null);
    mockPrisma.rideRequest.findUnique.mockResolvedValue(rideRequest);
    mockPrisma.rideRequest.create.mockResolvedValue(rideRequest);
    mockPrisma.rideRequest.update.mockResolvedValue({ ...rideRequest, status: 'ACCEPTED' });
  });

  it('차주 토큰으로 카풀을 생성한다', async () => {
    const body = await postGraphQL<CreateRidePayload>(driverToken(), CREATE_RIDE_MUTATION, {
      input: {
        departure: { lat: 37.4979, lng: 127.0276 },
        departureAddr: '강남역',
        arrival: { lat: 37.2636, lng: 127.0286 },
        arrivalAddr: '수원역',
        departureTime: future.toISOString(),
        availableSeats: 3,
        fare: 5000,
        preferences: { noSmoking: true },
      },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.createRide.id).toBe('ride-1');
    expect(body.data?.createRide.driver.id).toBe('driver-1');
    const createCall = firstMockArg<{ data: { companyId: string; driverId: string } }>(
      mockPrisma.ride.create,
    );
    expect(createCall.data).toMatchObject({
      companyId: 'company-1',
      driverId: 'driver-1',
    });
  });

  it('탑승자 토큰으로 반경 내 카풀을 검색한다', async () => {
    const body = await postGraphQL<SearchRidesPayload>(passengerToken(), SEARCH_RIDES_QUERY, {
      input: {
        departure: { lat: 37.4979, lng: 127.0276 },
        arrival: { lat: 37.2636, lng: 127.0286 },
        departureTime: future.toISOString(),
        passengers: 1,
        radiusKm: 5,
      },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.searchRides.totalCount).toBe(1);
    expect(body.data?.searchRides.nodes[0]?.id).toBe('ride-1');
  });

  it('탑승 요청을 만들고 차주가 수락한다', async () => {
    const requestBody = await postGraphQL<RequestRidePayload>(
      passengerToken(),
      REQUEST_RIDE_MUTATION,
      {
        input: {
          rideId: 'ride-1',
          pickup: { lat: 37.49, lng: 127.02 },
          pickupAddr: '강남역 1번 출구',
          message: '문 앞에서 탈게요',
        },
      },
    );

    expect(requestBody.errors).toBeUndefined();
    expect(requestBody.data?.requestRide.status).toBe('PENDING');

    const acceptBody = await postGraphQL<AcceptRideRequestPayload>(
      driverToken(),
      ACCEPT_RIDE_REQUEST_MUTATION,
      { id: 'request-1' },
    );

    expect(acceptBody.errors).toBeUndefined();
    expect(acceptBody.data?.acceptRideRequest.status).toBe('ACCEPTED');
    expect(acceptBody.data?.acceptRideRequest.ride.id).toBe('ride-1');
  });

  function driverToken(): string {
    return jwtTokenService.issueTokenPair({
      sub: 'driver-1',
      companyId: 'company-1',
      role: 'DRIVER',
      email: 'driver@ridy.test',
    }).accessToken;
  }

  function passengerToken(): string {
    return jwtTokenService.issueTokenPair({
      sub: 'passenger-1',
      companyId: 'company-1',
      role: 'PASSENGER',
      email: 'passenger@ridy.test',
    }).accessToken;
  }

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
});
