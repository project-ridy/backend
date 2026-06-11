import { Injectable } from '@nestjs/common';

import type { DomainEvent, DomainEventBus } from './domain-event-bus';

@Injectable()
export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly events: DomainEvent[] = [];

  async publish<TPayload extends Record<string, unknown>>(
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    await Promise.resolve();
    this.events.push(event);
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  getPublishedEvents(): readonly DomainEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }
}
