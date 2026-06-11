export type ServiceHealth = {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly service: string;
};
