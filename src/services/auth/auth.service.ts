import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Company, InviteCode, User, Vehicle } from '@prisma/client';

import type {
  AuthPayload,
  Company as GraphQLCompany,
  JoinWithInviteCodeInput,
  LoginInput,
  User as GraphQLUser,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtTokenService } from './jwt-token.service';
import { normalizeOAuthProvider, MockableSocialOAuthVerifier } from './social-oauth.verifier';
import type { OAuthProfile, SocialOAuthVerifier } from './social-oauth.verifier';

type CompanyWithCount = Company & { readonly _count: { readonly users: number } };
type InviteCodeWithCompany = InviteCode & { readonly company: CompanyWithCount };
type UserWithCompany = User & {
  readonly company: CompanyWithCount;
  readonly vehicles: Vehicle[];
};

type UserDelegate = {
  findFirst(args: object): Promise<UserWithCompany | null>;
  create(args: object): Promise<UserWithCompany>;
};

type InviteCodeDelegate = {
  findFirst(args: object): Promise<InviteCodeWithCompany | null>;
  update(args: object): Promise<InviteCode>;
};

type CompanyDelegate = {
  findUnique(args: object): Promise<CompanyWithCount | null>;
};

type AuthTransactionClient = {
  readonly user: UserDelegate;
  readonly inviteCode: InviteCodeDelegate;
  readonly company: CompanyDelegate;
};

export type AuthPrismaClient = AuthTransactionClient & {
  $transaction<T>(callback: (tx: AuthTransactionClient) => Promise<T>): Promise<T>;
};

const USER_INCLUDE = {
  company: {
    include: {
      _count: {
        select: { users: true },
      },
    },
  },
  vehicles: true,
} as const;

const INVITE_CODE_INCLUDE = {
  company: {
    include: {
      _count: {
        select: { users: true },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: AuthPrismaClient,
    private readonly jwtTokenService: JwtTokenService,
    @Inject(MockableSocialOAuthVerifier)
    private readonly socialOAuthVerifier: SocialOAuthVerifier,
  ) {}

  async login(input: LoginInput): Promise<AuthPayload> {
    const profile = await this.verifyProfile(input.provider, input.oauthToken);
    const user = await this.prisma.user.findFirst({
      where: {
        email: profile.email,
        provider: profile.provider,
      },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('가입되지 않은 계정입니다. 초대 코드로 가입해주세요.');
    }

    return this.createAuthPayload(user);
  }

  async joinWithInviteCode(input: JoinWithInviteCodeInput): Promise<AuthPayload> {
    const profile = await this.verifyProfile(input.provider, input.oauthToken);
    const normalizedCode = normalizeInviteCode(input.inviteCode);

    return this.prisma.$transaction(async (tx) => {
      const inviteCode = await tx.inviteCode.findFirst({
        where: { code: normalizedCode },
        include: INVITE_CODE_INCLUDE,
      });
      this.assertInviteCodeUsable(inviteCode);

      const existingUser = await tx.user.findFirst({
        where: { email: profile.email },
        include: USER_INCLUDE,
      });
      if (existingUser) {
        throw new ConflictException('이미 가입된 계정입니다');
      }

      const company = await tx.company.findUnique({
        where: { id: inviteCode.companyId },
        include: { _count: { select: { users: true } } },
      });
      if (!company) {
        throw new NotFoundException('회사를 찾을 수 없습니다');
      }
      if (company._count.users >= company.maxMembers) {
        throw new BadRequestException('회사 정원이 초과되었습니다');
      }

      const user = await tx.user.create({
        data: {
          companyId: inviteCode.companyId,
          email: profile.email,
          name: profile.name,
          imageUrl: profile.imageUrl,
          provider: profile.provider,
          providerId: profile.providerId,
          employeeId: input.employeeId ?? null,
        },
        include: USER_INCLUDE,
      });

      await tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: { currentUses: { increment: 1 } },
      });

      return this.createAuthPayload(user);
    });
  }

  async refreshToken(token: string): Promise<AuthPayload> {
    const payload = this.jwtTokenService.verifyRefreshToken(token);
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return this.createAuthPayload(user);
  }

  async currentUserFromAccessToken(token: string | null): Promise<GraphQLUser> {
    if (!token) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    const payload = this.jwtTokenService.verifyAccessToken(stripBearerPrefix(token));
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return toGraphQLUser(user);
  }

  private async verifyProfile(provider: string, oauthToken: string): Promise<OAuthProfile> {
    normalizeOAuthProvider(provider);
    if (oauthToken.trim().length === 0) {
      throw new UnauthorizedException('OAuth 토큰이 필요합니다');
    }

    return this.socialOAuthVerifier.verify(provider, oauthToken);
  }

  private createAuthPayload(user: UserWithCompany): AuthPayload {
    const tokenPair = this.jwtTokenService.issueTokenPair({
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    });

    return {
      ...tokenPair,
      user: toGraphQLUser(user),
    };
  }

  private assertInviteCodeUsable(
    inviteCode: InviteCodeWithCompany | null,
  ): asserts inviteCode is InviteCodeWithCompany {
    if (!inviteCode) {
      throw new NotFoundException('유효하지 않은 초대 코드입니다');
    }
    if (!inviteCode.isActive) {
      throw new BadRequestException('비활성화된 초대 코드입니다');
    }
    if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('만료된 초대 코드입니다');
    }
    if (inviteCode.currentUses >= inviteCode.maxUses) {
      throw new BadRequestException('초대 코드 사용 한도가 초과되었습니다');
    }
  }
}

function toGraphQLUser(user: UserWithCompany): GraphQLUser {
  return {
    ...user,
    rating: Number(user.rating),
    vehicles: user.vehicles ?? [],
    company: toGraphQLCompany(user.company),
  };
}

function toGraphQLCompany(company: CompanyWithCount): GraphQLCompany {
  return {
    ...company,
    memberCount: company._count.users,
  };
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function stripBearerPrefix(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}
