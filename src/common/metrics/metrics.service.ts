import { Injectable } from '@nestjs/common';

export type RequestMetricInput = {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationMs: number;
};

type MemoryUsageSnapshot = {
  readonly rss: number;
  readonly heapUsed: number;
};

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, number>();
  private requestDurationSumMs = 0;
  private requestDurationCount = 0;

  observeRequest(input: RequestMetricInput): void {
    const route = normalizeLabel(input.route);
    const method = normalizeLabel(input.method.toUpperCase());
    const status = String(input.statusCode);
    const key = `${method}|${route}|${status}`;

    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);
    this.requestDurationSumMs += Math.max(0, Math.round(input.durationMs));
    this.requestDurationCount += 1;
  }

  renderPrometheus(): string {
    const memory = memoryUsage();
    const lines = [
      '# HELP ridy_process_uptime_seconds Process uptime in seconds',
      '# TYPE ridy_process_uptime_seconds gauge',
      `ridy_process_uptime_seconds ${Math.floor(process.uptime())}`,
      '# HELP ridy_process_memory_rss_bytes Resident set size in bytes',
      '# TYPE ridy_process_memory_rss_bytes gauge',
      `ridy_process_memory_rss_bytes ${memory.rss}`,
      '# HELP ridy_process_memory_heap_used_bytes Heap used in bytes',
      '# TYPE ridy_process_memory_heap_used_bytes gauge',
      `ridy_process_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP ridy_http_requests_total Total HTTP requests',
      '# TYPE ridy_http_requests_total counter',
      ...this.renderRequestCounters(),
      '# HELP ridy_http_request_duration_ms_sum Sum of request durations in milliseconds',
      '# TYPE ridy_http_request_duration_ms_sum counter',
      `ridy_http_request_duration_ms_sum ${this.requestDurationSumMs}`,
      '# HELP ridy_http_request_duration_ms_count Count of request durations',
      '# TYPE ridy_http_request_duration_ms_count counter',
      `ridy_http_request_duration_ms_count ${this.requestDurationCount}`,
      '',
    ];

    return lines.join('\n');
  }

  private renderRequestCounters(): ReadonlyArray<string> {
    return [...this.requests.entries()].map(([key, count]) => {
      const [method, route, status] = key.split('|');
      return `ridy_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`;
    });
  }
}

function memoryUsage(): MemoryUsageSnapshot {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
  };
}

function normalizeLabel(value: string): string {
  return value.replaceAll('"', '\\"');
}
