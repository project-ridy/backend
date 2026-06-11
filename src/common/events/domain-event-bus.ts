export const DOMAIN_EVENT_BUS = Symbol('DOMAIN_EVENT_BUS');

export type DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly companyId?: string;
  readonly actorId?: string;
  readonly payload: TPayload;
};

export interface DomainEventBus {
  publish<TPayload extends Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}
