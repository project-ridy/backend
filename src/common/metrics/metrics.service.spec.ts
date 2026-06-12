import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('요청 메트릭을 기록한다', () => {
    const service = new MetricsService();

    service.observeRequest({ method: 'POST', route: '/graphql', statusCode: 200, durationMs: 12 });

    const metrics = service.renderPrometheus();

    expect(metrics).toContain(
      'ridy_http_requests_total{method="POST",route="/graphql",status="200"} 1',
    );
    expect(metrics).toContain('ridy_http_request_duration_ms_sum 12');
    expect(metrics).toContain('ridy_process_uptime_seconds');
  });
});
