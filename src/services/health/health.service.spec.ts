import { HealthService } from './health.service';

type MockPrisma = {
  readonly $queryRaw: jest.Mock;
};

describe('헬스 서비스', () => {
  let prisma: MockPrisma;
  let service: HealthService;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ healthcheck: 1 }]),
    };
    service = new HealthService(prisma as never);
  });

  it('서비스 상태와 의존성 상태를 반환한다', async () => {
    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('ridy-backend');
    expect(health.database.status).toBe('ok');
    expect(health.redis.status).toBe('disabled');
    expect(health.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(health.timestamp).toBeInstanceOf(Date);
  });

  it('DB 실패 시 degraded 상태를 반환한다', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database offline'));

    const health = await service.getHealth();

    expect(health.status).toBe('degraded');
    expect(health.database.status).toBe('error');
    expect(health.database.message).toBe('database offline');
  });

  it('live 상태를 반환한다', () => {
    expect(service.getLive()).toEqual({
      status: 'ok',
      service: 'ridy-backend',
      uptimeSec: expect.any(Number) as number,
    });
  });
});
