import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { CurrentUser, GraphQLContext } from '../../common/context/graphql-context';
import type {
  CalculateFareInput,
  FareCalculation,
  PaginationInput,
  PaymentMethod,
  RegisterPaymentMethodInput,
  Settlement,
} from '../../graphql/generated/schema-types';
import { PaymentService } from './payment.service';

@Resolver('Settlement')
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Query('calculateFare')
  async calculateFare(
    @Context() context: GraphQLContext,
    @Args('input') input: CalculateFareInput,
  ): Promise<FareCalculation> {
    return this.paymentService.calculateFare(this.currentUser(context), input);
  }

  @Query('mySettlements')
  async mySettlements(
    @Context() context: GraphQLContext,
    @Args('pagination') pagination: PaginationInput | null,
  ): Promise<ReadonlyArray<Settlement>> {
    return this.paymentService.mySettlements(this.currentUser(context), pagination);
  }

  @Query('settlementDetail')
  async settlementDetail(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<Settlement> {
    return this.paymentService.settlementDetail(this.currentUser(context), id);
  }

  @Query('myPaymentMethods')
  async myPaymentMethods(
    @Context() context: GraphQLContext,
  ): Promise<ReadonlyArray<PaymentMethod>> {
    return this.paymentService.myPaymentMethods(this.currentUser(context));
  }

  @Mutation('paySettlement')
  async paySettlement(
    @Context() context: GraphQLContext,
    @Args('settlementId') settlementId: string,
    @Args('idempotencyKey') idempotencyKey: string,
  ): Promise<Settlement> {
    return this.paymentService.paySettlement(
      this.currentUser(context),
      settlementId,
      idempotencyKey,
    );
  }

  @Mutation('registerPaymentMethod')
  async registerPaymentMethod(
    @Context() context: GraphQLContext,
    @Args('input') input: RegisterPaymentMethodInput,
  ): Promise<PaymentMethod> {
    return this.paymentService.registerPaymentMethod(this.currentUser(context), input);
  }

  @Mutation('deletePaymentMethod')
  async deletePaymentMethod(
    @Context() context: GraphQLContext,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.paymentService.deletePaymentMethod(this.currentUser(context), id);
  }

  private currentUser(context: GraphQLContext): CurrentUser {
    if (!context.currentUser) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return context.currentUser;
  }
}
