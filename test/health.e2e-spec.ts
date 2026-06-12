import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type GraphQLHealthResponse = {
  errors?: unknown;
  data?: {
    health: {
      status: string;
      service: string;
      database: { status: string };
      redis: { status: string };
      uptimeSec: number;
    };
  };
};

type LiveResponse = {
  readonly status: string;
  readonly service: string;
  readonly uptimeSec: number;
};

type ReadyResponse = {
  readonly status: string;
  readonly service: string;
  readonly database: { readonly status: string };
  readonly redis: { readonly status: string };
};

const mockPrisma = {
  $queryRaw: jest.fn().mockResolvedValue([{ healthcheck: 1 }]),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

describe('헬스 체크 GraphQL (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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

  it('health 쿼리는 서비스 상태를 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          query Health {
            health {
              status
              service
              database {
                status
              }
              redis {
                status
              }
              uptimeSec
            }
          }
        `,
      })
      .expect(200)
      .expect(({ body }: { body: GraphQLHealthResponse }) => {
        expect(body.errors).toBeUndefined();
        expect(body.data?.health.status).toBe('ok');
        expect(body.data?.health.service).toBe('ridy-backend');
        expect(body.data?.health.database.status).toBe('ok');
        expect(body.data?.health.redis.status).toBe('disabled');
        expect(body.data?.health.uptimeSec).toBeGreaterThanOrEqual(0);
      });
  });

  it('live endpoint는 생존 상태를 반환한다', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect(({ body }: { body: LiveResponse }) => {
        expect(body.status).toBe('ok');
        expect(body.service).toBe('ridy-backend');
      });
  });

  it('ready endpoint는 DB 상태를 반환한다', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect(({ body }: { body: ReadyResponse }) => {
        expect(body.status).toBe('ok');
        expect(body.database.status).toBe('ok');
        expect(body.redis.status).toBe('disabled');
      });
  });
});
