import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';

type GraphQLHealthResponse = {
  errors?: unknown;
  data?: {
    health: {
      status: string;
      service: string;
    };
  };
};

describe('헬스 체크 GraphQL (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
            }
          }
        `,
      })
      .expect(200)
      .expect(({ body }: { body: GraphQLHealthResponse }) => {
        expect(body.errors).toBeUndefined();
        expect(body.data).toEqual({
          health: { status: 'ok', service: 'ridy-backend' },
        });
      });
  });
});
