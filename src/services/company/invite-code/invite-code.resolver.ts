import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Plan } from '@prisma/client';

import type { GraphQLContext } from '../../../common/context/graphql-context';
import type {
  InviteCode,
  MutationDeactivateInviteCodeArgs,
  MutationGenerateInviteCodeArgs,
  QueryValidateInviteCodeArgs,
} from '../../../graphql/generated/schema-types';
import { InviteCodeService } from './invite-code.service';

type InviteCodeRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly createdBy: string;
  readonly maxUses: number;
  readonly currentUses: number;
  readonly expiresAt: Date | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly company: {
    readonly id: string;
    readonly name: string;
    readonly inviteCode: string;
    readonly domain: string | null;
    readonly plan: Plan;
    readonly maxMembers: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly _count: {
      readonly users: number;
    };
  };
};

function toInviteCode(record: InviteCodeRecord): InviteCode {
  return {
    id: record.id,
    companyId: record.companyId,
    code: record.code,
    createdBy: record.createdBy,
    maxUses: record.maxUses,
    currentUses: record.currentUses,
    expiresAt: record.expiresAt,
    isActive: record.isActive,
    createdAt: record.createdAt,
    company: {
      id: record.company.id,
      name: record.company.name,
      inviteCode: record.company.inviteCode,
      domain: record.company.domain,
      plan: record.company.plan,
      maxMembers: record.company.maxMembers,
      memberCount: record.company._count.users,
      createdAt: record.company.createdAt,
      updatedAt: record.company.updatedAt,
    },
  };
}

@Resolver('InviteCode')
export class InviteCodeResolver {
  constructor(private readonly inviteCodeService: InviteCodeService) {}

  @Query('validateInviteCode')
  async validateInviteCode(@Args() args: QueryValidateInviteCodeArgs): Promise<InviteCode> {
    const inviteCode = await this.inviteCodeService.validateInviteCode(args.code);
    return toInviteCode(inviteCode);
  }

  @Query('inviteCodes')
  async inviteCodes(@Context() context: GraphQLContext): Promise<InviteCode[]> {
    const inviteCodes = await this.inviteCodeService.listInviteCodes(context.currentUser);
    return inviteCodes.map(toInviteCode);
  }

  @Mutation('generateInviteCode')
  async generateInviteCode(
    @Args() args: MutationGenerateInviteCodeArgs,
    @Context() context: GraphQLContext,
  ): Promise<InviteCode> {
    const inviteCode = await this.inviteCodeService.generateInviteCode(
      context.currentUser,
      args.input,
    );
    return toInviteCode(inviteCode);
  }

  @Mutation('deactivateInviteCode')
  async deactivateInviteCode(
    @Args() args: MutationDeactivateInviteCodeArgs,
    @Context() context: GraphQLContext,
  ): Promise<InviteCode> {
    const inviteCode = await this.inviteCodeService.deactivateInviteCode(
      context.currentUser,
      args.id,
    );
    return toInviteCode(inviteCode);
  }
}
