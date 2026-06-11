import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type GraphQLResponse<T> = {
  errors?: ReadonlyArray<{ message: string }>;
  data?: T;
};

type AuthPayload = {
  login: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      provider: string;
      role: string;
      company: { id: string; name: string; memberCount: number };
    };
  };
};

type MePayload = {
  me: {
    id: string;
    email: string;
    name: string;
  };
};

type RefreshPayload = {
  refreshToken: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
  };
};

const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        name
        provider
        role
        company {
          id
          name
          memberCount
        }
      }
    }
  }
`;

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      name
    }
  }
`;

const REFRESH_MUTATION = /* GraphQL */ `
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      accessToken
      refreshToken
      user {
        id
        email
      }
    }
  }
`;

const now = new Date('2026-01-01T00:00:00Z');

const mockCompany = {
  id: 'company-1',
  name: '테크스타터',
  inviteCode: 'TECH01',
  domain: 'techstarter.co.kr',
  plan: 'PRO' as const,
  maxMembers: 50,
  createdAt: now,
  updatedAt: now,
  _count: { users: 10 },
};

const mockUser = {
  id: 'user-1',
  companyId: 'company-1',
  employeeId: 'E-001',
  email: 'user@techstarter.co.kr',
  name: '정원',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO' as const,
  providerId: 'kakao-1',
  role: 'PASSENGER' as const,
  rating: 0,
  rideCount: 0,
  company: mockCompany,
  createdAt: now,
  updatedAt: now,
};

// -- Mock PrismaService with jest spies --
interface MockPrismaDelegates {
  user: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  inviteCode: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
  };
}

interface MockPrismaService extends MockPrismaDelegates {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
}

function createMockPrisma(): MockPrismaService {
  const prisma: MockPrismaService = {
    user: {
      findFirst: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue(mockUser),
    },
    inviteCode: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    company: {
      findUnique: jest.fn().mockResolvedValue(mockCompany),
    },
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  prisma.$transaction.mockImplementation(
    async (cb: (tx: MockPrismaDelegates) => Promise<unknown>) => cb(prisma),
  );
  return prisma;
}

describe('인증 API GraphQL (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('login mutation', () => {
    it('mock 토큰으로 카카오 로그인 시 JWT 토큰을 발급한다', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'KAKAO',
              oauthToken: 'mock:user@techstarter.co.kr:정원:kakao-1',
            },
          },
        });

      const body = res.body as GraphQLResponse<AuthPayload>;
      expect(body.errors).toBeUndefined();
      expect(body.data?.login.accessToken).toEqual(expect.any(String));
      expect(body.data?.login.refreshToken).toEqual(expect.any(String));
      expect(body.data?.login.user.email).toBe('user@techstarter.co.kr');
      expect(body.data?.login.user.provider).toBe('KAKAO');
    });

    it('mock 토큰으로 구글 로그인 시 JWT 토큰을 발급한다', async () => {
      const googleUser = { ...mockUser, provider: 'GOOGLE' as const, providerId: 'google-1' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(googleUser);

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'GOOGLE',
              oauthToken: 'mock:user@techstarter.co.kr:정원:google-1',
            },
          },
        });

      const body = res.body as GraphQLResponse<AuthPayload>;
      expect(body.errors).toBeUndefined();
      expect(body.data?.login.accessToken).toEqual(expect.any(String));
      expect(body.data?.login.user.provider).toBe('GOOGLE');
    });

    it('지원하지 않는 provider면 에러를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'APPLE',
              oauthToken: 'mock:test@test.com:테스트:apple-1',
            },
          },
        });

      const body = res.body as GraphQLResponse<AuthPayload>;
      expect(body.errors).toBeDefined();
      expect(body.errors?.[0]?.message).toMatch(/지원하지/);
    });

    it('빈 OAuth 토큰이면 에러를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: { provider: 'KAKAO', oauthToken: '' },
          },
        });

      const body = res.body as GraphQLResponse<AuthPayload>;
      expect(body.errors).toBeDefined();
    });

    it('미가입 이메일이면 에러를 반환한다', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'KAKAO',
              oauthToken: 'mock:new@test.com:신규:kakao-new',
            },
          },
        });

      const body = res.body as GraphQLResponse<AuthPayload>;
      expect(body.errors).toBeDefined();
      expect(body.errors?.[0]?.message).toMatch(/가입되지/);
    });
  });

  describe('me query (AuthGuard)', () => {
    it('유효한 access token으로 내 프로필을 조회한다', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);
      const loginRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'KAKAO',
              oauthToken: 'mock:user@techstarter.co.kr:정원:kakao-1',
            },
          },
        });

      const loginBody = loginRes.body as GraphQLResponse<AuthPayload>;
      const accessToken = loginBody.data!.login.accessToken;

      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);
      const meRes = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: ME_QUERY });

      const meBody = meRes.body as GraphQLResponse<MePayload>;
      expect(meBody.errors).toBeUndefined();
      expect(meBody.data?.me.email).toBe('user@techstarter.co.kr');
    });

    it('토큰 없이 me 쿼리 시 에러를 반환한다', async () => {
      const res = await request(app.getHttpServer()).post('/graphql').send({ query: ME_QUERY });

      const body = res.body as GraphQLResponse<MePayload>;
      expect(body.errors).toBeDefined();
    });

    it('잘못된 토큰으로 me 쿼리 시 에러를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: ME_QUERY });

      const body = res.body as GraphQLResponse<MePayload>;
      expect(body.errors).toBeDefined();
    });
  });

  describe('refreshToken mutation', () => {
    it('유효한 refresh token으로 새 토큰을 발급한다', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);
      const loginRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'KAKAO',
              oauthToken: 'mock:user@techstarter.co.kr:정원:kakao-1',
            },
          },
        });

      const loginBody = loginRes.body as GraphQLResponse<AuthPayload>;
      const refreshToken = loginBody.data!.login.refreshToken;

      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);
      const refreshRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: REFRESH_MUTATION,
          variables: { token: refreshToken },
        });

      const refreshBody = refreshRes.body as GraphQLResponse<RefreshPayload>;
      expect(refreshBody.errors).toBeUndefined();
      expect(refreshBody.data?.refreshToken.accessToken).toEqual(expect.any(String));
      expect(refreshBody.data?.refreshToken.refreshToken).toEqual(expect.any(String));
      expect(refreshBody.data?.refreshToken.user.email).toBe('user@techstarter.co.kr');
    });

    it('access token으로 refresh 시도 시 에러를 반환한다', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);
      const loginRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              provider: 'KAKAO',
              oauthToken: 'mock:user@techstarter.co.kr:정원:kakao-1',
            },
          },
        });

      const loginBody = loginRes.body as GraphQLResponse<AuthPayload>;
      const accessToken = loginBody.data!.login.accessToken;

      const refreshRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: REFRESH_MUTATION,
          variables: { token: accessToken },
        });

      const refreshBody = refreshRes.body as GraphQLResponse<RefreshPayload>;
      expect(refreshBody.errors).toBeDefined();
    });
  });
});
