import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { MockPaymentGateway, PAYMENT_GATEWAY } from './payment-gateway';
import { PaymentResolver } from './payment.resolver';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule],
  providers: [
    PaymentResolver,
    PaymentService,
    {
      provide: PAYMENT_GATEWAY,
      useClass: MockPaymentGateway,
    },
  ],
  exports: [PaymentService],
})
export class PaymentServiceModule {}
