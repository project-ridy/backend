import { Module } from '@nestjs/common';

import { DOMAIN_EVENT_BUS } from './domain-event-bus';
import { InMemoryDomainEventBus } from './in-memory-domain-event-bus';

@Module({
  providers: [
    InMemoryDomainEventBus,
    {
      provide: DOMAIN_EVENT_BUS,
      useExisting: InMemoryDomainEventBus,
    },
  ],
  exports: [DOMAIN_EVENT_BUS, InMemoryDomainEventBus],
})
export class EventsModule {}
