import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtTokenService } from '../src/services/auth/jwt-token.service';

type GraphQLResponse<T> = {
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
  readonly data?: T;
};

type CalculateFarePayload = {
  readonly calculateFare: {
    readonly distanceKm: number;
    readonly baseFare: number;
    readonly platformFee: number;
    readonly companySubsidy: number;
    readonly passengerAmount: number;
    readonly driverAmount: number;
  } | null;
};

type MySettlementsPayload = {
  readonly mySettlements: ReadonlyArray<{
    readonly id: string;
    readonly status: string;
    readonly amount: number;
  }>;
};

type PaySettlementPayload = {
  readonly paySettlement: {
    readonly id: string;
    readonly status: string;
    readonly paidAt: string | null;
  } | null;
};

type PaymentMethodPayload = {
  readonly registerPaymentMethod: {
    readonly id: string;
    readonly type: string;
    readonly alias: string | null;
    readonly isDefault: boolean;
  } | null;
};

type MyPaymentMethodsPayload = {
  readonly myPaymentMethods: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly isDefault: boolean;
  }>;
};

type DeletePaymentMethodPayload = {
  readonly deletePaymentMethod: boolean | null;
};

type CreateReviewPayload = {
  readonly createReview: {
    readonly id: string;
    readonly rating: number;
    readonly toUser: { readonly id: string };
  } | null;
};

type RideReviewsPayload = {
  readonly rideReviews: ReadonlyArray<{
    readonly id: string;
    readonly rating: number;
    readonly ride: { readonly id: string };
  }>;
};

type UserReviewsPayload = {
  readonly userReviews: ReadonlyArray<{
    readonly id: string;
    readonly rating: number;
    readonly toUser: { readonly id: string };
  }>;
};

type MockPrismaService = {
  readonly company: {
    readonly findUnique: jest.Mock;
  };
  readonly settlement: {
    readonly findMany: jest.Mock;
    readonly findFirst: jest.Mock;
    readonly update: jest.Mock;
  };
  readonly paymentMethod: {
    readonly count: jest.Mock;
    readonly create: jest.Mock;
    readonly findMany: jest.Mock;
    readonly findFirst: jest.Mock;
    readonly delete: jest.Mock;
  };
  readonly ride: {
    readonly findFirst: jest.Mock;
  };
  readonly review: {
    readonly findFirst: jest.Mock;
    readonly create: jest.Mock;
    readonly findMany: jest.Mock;
    readonly aggregate: jest.Mock;
  };
  readonly user: {
    readonly findFirst: jest.Mock;
    readonly update: jest.Mock;
  };
  readonly $transaction: jest.Mock;
  readonly $connect: jest.Mock;
  readonly $disconnect: jest.Mock;
};

const CALCULATE_FARE_QUERY = /* GraphQL */ `
  query CalculateFare($input: CalculateFareInput!) {
    calculateFare(input: $input) {
      distanceKm
      baseFare
      platformFee
      companySubsidy
      passengerAmount
      driverAmount
    }
  }
`;

const MY_SETTLEMENTS_QUERY = /* GraphQL */ `
  query MySettlements {
    mySettlements {
      id
      status
      amount
    }
  }
`;

const PAY_SETTLEMENT_MUTATION = /* GraphQL */ `
  mutation PaySettlement($settlementId: ID!, $idempotencyKey: String!) {
    paySettlement(settlementId: $settlementId, idempotencyKey: $idempotencyKey) {
      id
      status
      paidAt
    }
  }
`;

const REGISTER_PAYMENT_METHOD_MUTATION = /* GraphQL */ `
  mutation RegisterPaymentMethod($input: RegisterPaymentMethodInput!) {
    registerPaymentMethod(input: $input) {
      id
      type
      alias
      isDefault
    }
  }
`;

const MY_PAYMENT_METHODS_QUERY = /* GraphQL */ `
  query MyPaymentMethods {
    myPaymentMethods {
      id
      type
      isDefault
    }
  }
`;

const DELETE_PAYMENT_METHOD_MUTATION = /* GraphQL */ `
  mutation DeletePaymentMethod($id: ID!) {
    deletePaymentMethod(id: $id)
  }
`;

const CREATE_REVIEW_MUTATION = /* GraphQL */ `
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      toUser {
        id
      }
    }
  }
`;

const RIDE_REVIEWS_QUERY = /* GraphQL */ `
  query RideReviews($rideId: ID!) {
    rideReviews(rideId: $rideId) {
      id
      rating
      ride {
        id
      }
    }
  }
`;

const USER_REVIEWS_QUERY = /* GraphQL */ `
  query UserReviews($userId: ID!) {
    userReviews(userId: $userId) {
      id
      rating
      toUser {
        id
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
const rideRequest = {
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
};
const ride = {
  id: 'ride-1',
  companyId: 'company-1',
  driverId: 'driver-1',
  departureLat: 0,
  departureLng: 0,
  departureAddr: '출발지',
  arrivalLat: 0,
  arrivalLng: 0.2563,
  arrivalAddr: '도착지',
  departureTime: now,
  availableSeats: 3,
  fare: 14970,
  recurringDays: null,
  recurringEnd: null,
  preferences: null,
  status: 'COMPLETED',
  createdAt: now,
  updatedAt: now,
  driver,
  requests: [rideRequest],
};
const settlement = {
  id: 'settlement-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  companyId: 'company-1',
  amount: 5240,
  driverAmount: 4740,
  platformFee: 250,
  companyFee: 0,
  passengerFee: 250,
  status: 'PENDING',
  dueDate: null,
  paidAt: null,
  createdAt: now,
  ride,
  passenger,
};
const paymentMethod = {
  id: 'payment-method-1',
  userId: 'passenger-1',
  type: 'CARD',
  billingKey: 'billing-key-1',
  alias: '개인 카드',
  isDefault: true,
  createdAt: now,
};
const review = {
  id: 'review-1',
  rideId: 'ride-1',
  fromId: 'passenger-1',
  toId: 'driver-1',
  rating: 5,
  comment: '좋은 운행이었어요',
  createdAt: now,
  ride,
  fromUser: passenger,
  toUser: driver,
};

describe('정산/평점 API GraphQL (e2e)', () => {
  let app: INestApplication;
  let jwtTokenService: JwtTokenService;
  let mockPrisma: MockPrismaService;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
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
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-1', plan: 'FREE' });
    mockPrisma.settlement.findMany.mockResolvedValue([settlement]);
    mockPrisma.settlement.findFirst.mockResolvedValue(settlement);
    mockPrisma.settlement.update.mockResolvedValue({
      ...settlement,
      status: 'COMPLETED',
      paidAt: now,
    });
    mockPrisma.paymentMethod.count.mockResolvedValue(0);
    mockPrisma.paymentMethod.create.mockResolvedValue(paymentMethod);
    mockPrisma.paymentMethod.findMany.mockResolvedValue([paymentMethod]);
    mockPrisma.paymentMethod.findFirst.mockResolvedValue(paymentMethod);
    mockPrisma.paymentMethod.delete.mockResolvedValue(paymentMethod);
    mockPrisma.ride.findFirst.mockResolvedValue(ride);
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue(review);
    mockPrisma.review.findMany.mockResolvedValue([review]);
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 } });
    mockPrisma.user.findFirst.mockResolvedValue(driver);
    mockPrisma.user.update.mockResolvedValue({ ...driver, rating: 5 });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) => callback(mockPrisma),
    );
  });

  it('인증 없이는 정산을 조회할 수 없다', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').send({
      query: MY_SETTLEMENTS_QUERY,
    });

    const body = response.body as GraphQLResponse<MySettlementsPayload>;
    expect(response.status).toBe(200);
    expect(body.errors?.[0]?.message).toMatch(/인증/);
  });

  it('요금을 계산한다', async () => {
    const body = await postGraphQL<CalculateFarePayload>(passengerToken(), CALCULATE_FARE_QUERY, {
      input: { departure: { lat: 0, lng: 0 }, arrival: { lat: 0, lng: 0.2563 }, passengers: 3 },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.calculateFare).toMatchObject({
      distanceKm: 28.5,
      baseFare: 4990,
      platformFee: 250,
      passengerAmount: 5240,
      driverAmount: 4740,
    });
  });

  it('잘못된 요금 계산 입력을 거부한다', async () => {
    const body = await postGraphQL<CalculateFarePayload>(passengerToken(), CALCULATE_FARE_QUERY, {
      input: { departure: { lat: 0, lng: 0 }, arrival: { lat: 0, lng: 0.2563 }, passengers: 0 },
    });

    expect(body.errors?.[0]?.message).toMatch(/탑승 인원/);
  });

  it('내 정산 목록을 조회한다', async () => {
    const body = await postGraphQL<MySettlementsPayload>(
      passengerToken(),
      MY_SETTLEMENTS_QUERY,
      {},
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.mySettlements[0]).toMatchObject({ id: 'settlement-1', status: 'PENDING' });
  });

  it('정산 결제를 승인한다', async () => {
    const body = await postGraphQL<PaySettlementPayload>(
      passengerToken(),
      PAY_SETTLEMENT_MUTATION,
      {
        settlementId: 'settlement-1',
        idempotencyKey: 'idem-1',
      },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.paySettlement?.status).toBe('PAID');
  });

  it('이미 결제된 정산 결제를 거부한다', async () => {
    mockPrisma.settlement.findFirst.mockResolvedValue({ ...settlement, status: 'COMPLETED' });

    const body = await postGraphQL<PaySettlementPayload>(
      passengerToken(),
      PAY_SETTLEMENT_MUTATION,
      {
        settlementId: 'settlement-1',
        idempotencyKey: 'idem-1',
      },
    );

    expect(body.errors?.[0]?.message).toMatch(/이미 결제 완료/);
  });

  it('결제수단을 등록한다', async () => {
    const body = await postGraphQL<PaymentMethodPayload>(
      passengerToken(),
      REGISTER_PAYMENT_METHOD_MUTATION,
      {
        input: { type: 'CARD', billingKey: 'billing-key-1', alias: '개인 카드' },
      },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.registerPaymentMethod).toMatchObject({
      id: 'payment-method-1',
      isDefault: true,
    });
  });

  it('결제수단 목록을 조회한다', async () => {
    const body = await postGraphQL<MyPaymentMethodsPayload>(
      passengerToken(),
      MY_PAYMENT_METHODS_QUERY,
      {},
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.myPaymentMethods[0]?.type).toBe('CARD');
  });

  it('결제수단을 삭제한다', async () => {
    const body = await postGraphQL<DeletePaymentMethodPayload>(
      passengerToken(),
      DELETE_PAYMENT_METHOD_MUTATION,
      { id: 'payment-method-1' },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deletePaymentMethod).toBe(true);
  });

  it('리뷰를 생성한다', async () => {
    const body = await postGraphQL<CreateReviewPayload>(passengerToken(), CREATE_REVIEW_MUTATION, {
      input: { rideId: 'ride-1', toUserId: 'driver-1', rating: 5, comment: '좋은 운행이었어요' },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.createReview).toMatchObject({ id: 'review-1', rating: 5 });
  });

  it('잘못된 평점을 거부한다', async () => {
    const body = await postGraphQL<CreateReviewPayload>(passengerToken(), CREATE_REVIEW_MUTATION, {
      input: { rideId: 'ride-1', toUserId: 'driver-1', rating: 6, comment: null },
    });

    expect(body.errors?.[0]?.message).toMatch(/평점/);
  });

  it('중복 리뷰를 거부한다', async () => {
    mockPrisma.review.findFirst.mockResolvedValue(review);

    const body = await postGraphQL<CreateReviewPayload>(passengerToken(), CREATE_REVIEW_MUTATION, {
      input: { rideId: 'ride-1', toUserId: 'driver-1', rating: 5, comment: null },
    });

    expect(body.errors?.[0]?.message).toMatch(/이미 작성/);
  });

  it('운행 리뷰 목록을 조회한다', async () => {
    const body = await postGraphQL<RideReviewsPayload>(passengerToken(), RIDE_REVIEWS_QUERY, {
      rideId: 'ride-1',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.rideReviews[0]).toMatchObject({ id: 'review-1', rating: 5 });
  });

  it('유저 받은 리뷰 목록을 조회한다', async () => {
    const body = await postGraphQL<UserReviewsPayload>(passengerToken(), USER_REVIEWS_QUERY, {
      userId: 'driver-1',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.userReviews[0]?.toUser.id).toBe('driver-1');
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

  function passengerToken(): string {
    return jwtTokenService.issueTokenPair({
      sub: passenger.id,
      companyId: 'company-1',
      role: passenger.role,
      email: passenger.email,
    }).accessToken;
  }
});

function createMockPrisma(): MockPrismaService {
  const prisma: MockPrismaService = {
    company: {
      findUnique: jest.fn(),
    },
    settlement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentMethod: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    ride: {
      findFirst: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (tx: MockPrismaService) => Promise<unknown>) => callback(prisma),
  );
  return prisma;
}
