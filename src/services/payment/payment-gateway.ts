import { Injectable } from '@nestjs/common';

export const PAYMENT_GATEWAY = Symbol.for('PAYMENT_GATEWAY');

export type ApprovePaymentInput = {
  readonly settlementId: string;
  readonly amount: number;
  readonly idempotencyKey: string;
};

export type ApprovePaymentResult = {
  readonly approved: boolean;
  readonly failureReason?: string;
};

export interface PaymentGateway {
  approvePayment(input: ApprovePaymentInput): Promise<ApprovePaymentResult>;
}

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  approvePayment(): Promise<ApprovePaymentResult> {
    return Promise.resolve({ approved: true });
  }
}
