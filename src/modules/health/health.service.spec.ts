import { HealthService } from './health.service';

describe('헬스 서비스', () => {
  it('서비스 상태를 반환한다', () => {
    const service = new HealthService();

    expect(service.getHealth()).toEqual({
      status: 'ok',
      service: 'ridy-backend',
    });
  });
});
