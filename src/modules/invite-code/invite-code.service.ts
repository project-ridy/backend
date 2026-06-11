import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CurrentUser } from '../../graphql/context';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_ACTIVE_INVITE_CODES = 10;
const DEFAULT_MAX_USES = 10;
const MAX_USES_LIMIT = 100;
const INVITE_CODE_LENGTH = 6;
const MAX_CODE_GENERATION_ATTEMPTS = 3;
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type GenerateInviteCodeInput = {
  readonly maxUses?: number | null;
  readonly expiresAt?: Date | null;
};

const inviteCodeInclude = {
  company: {
    include: {
      _count: {
        select: { users: true },
      },
    },
  },
} as const;

@Injectable()
export class InviteCodeService {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async generateInviteCode(currentUser: CurrentUser | undefined, input: GenerateInviteCodeInput) {
    const admin = this.assertAdmin(currentUser);
    const maxUses = input.maxUses ?? DEFAULT_MAX_USES;

    this.assertValidMaxUses(maxUses);
    this.assertFutureExpiresAt(input.expiresAt ?? null);

    const activeCount = await this.prisma.inviteCode.count({
      where: {
        companyId: admin.companyId,
        isActive: true,
      },
    });

    if (activeCount >= MAX_ACTIVE_INVITE_CODES) {
      throw new BadRequestException('활성 초대 코드는 10개까지 가능합니다');
    }

    const code = await this.createUniqueCode(admin.companyId);

    return this.prisma.inviteCode.create({
      data: {
        companyId: admin.companyId,
        code,
        createdBy: admin.id,
        maxUses,
        expiresAt: input.expiresAt ?? null,
        isActive: true,
      },
      include: inviteCodeInclude,
    });
  }

  async validateInviteCode(code: string) {
    const normalizedCode = this.normalizeCode(code);
    const inviteCode = await this.prisma.inviteCode.findFirst({
      where: { code: normalizedCode },
      include: inviteCodeInclude,
    });

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

    if (inviteCode.company._count.users >= inviteCode.company.maxMembers) {
      throw new BadRequestException('회사 정원이 초과되었습니다');
    }

    return inviteCode;
  }

  async listInviteCodes(currentUser: CurrentUser | undefined) {
    const admin = this.assertAdmin(currentUser);

    return this.prisma.inviteCode.findMany({
      where: { companyId: admin.companyId },
      orderBy: { createdAt: 'desc' },
      include: inviteCodeInclude,
    });
  }

  async deactivateInviteCode(currentUser: CurrentUser | undefined, id: string) {
    const admin = this.assertAdmin(currentUser);
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { id },
      include: inviteCodeInclude,
    });

    if (!inviteCode) {
      throw new NotFoundException('초대 코드를 찾을 수 없습니다');
    }

    if (inviteCode.companyId !== admin.companyId) {
      throw new ForbiddenException('다른 회사 초대 코드에 접근할 수 없습니다');
    }

    if (!inviteCode.isActive) {
      throw new BadRequestException('이미 비활성화된 코드입니다');
    }

    return this.prisma.inviteCode.update({
      where: { id },
      data: { isActive: false },
      include: inviteCodeInclude,
    });
  }

  private assertAdmin(currentUser: CurrentUser | undefined): CurrentUser {
    if (!currentUser) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return currentUser;
  }

  private assertValidMaxUses(maxUses: number): void {
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      throw new BadRequestException('초대 코드 사용 횟수는 1 이상이어야 합니다');
    }

    if (maxUses > MAX_USES_LIMIT) {
      throw new BadRequestException('최대 100명까지 설정 가능합니다');
    }
  }

  private assertFutureExpiresAt(expiresAt: Date | null): void {
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('만료일은 현재 시각 이후여야 합니다');
    }
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async createUniqueCode(companyId: string): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = this.generateRandomCode();
      const existingCode = await this.prisma.inviteCode.findFirst({
        where: {
          companyId,
          code,
        },
      });

      if (!existingCode) {
        return code;
      }
    }

    throw new BadRequestException('초대 코드 생성에 실패했습니다. 다시 시도해주세요');
  }

  private generateRandomCode(): string {
    let code = '';

    for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
      const charIndex = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
      code += INVITE_CODE_CHARS[charIndex];
    }

    return code;
  }
}
