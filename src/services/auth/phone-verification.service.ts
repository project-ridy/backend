import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'node:crypto';

import type { CurrentUser } from '../../common/context/graphql-context';
import type {
  PhoneVerificationCodePayload,
  PhoneVerificationPayload,
  SendPhoneVerificationCodeInput,
  VerifyPhoneCodeInput,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsoleSmsSender } from './sms.sender';
import type { SmsSender } from './sms.sender';

export const SMS_SENDER = Symbol('SMS_SENDER');
export const PHONE_CODE_GENERATOR = Symbol('PHONE_CODE_GENERATOR');

export type PhoneCodeGenerator = () => string;

type PhoneVerificationCodeDelegate = {
  updateMany(args: object): Promise<unknown>;
  create(args: object): Promise<unknown>;
  findFirst(args: object): Promise<PhoneVerificationCodeRecord | null>;
  update(args: object): Promise<unknown>;
};

type UserDelegate = {
  update(args: object): Promise<unknown>;
};

type PhoneVerificationTransactionClient = {
  readonly phoneVerificationCode: PhoneVerificationCodeDelegate;
  readonly user: UserDelegate;
};

export type PhoneVerificationPrismaClient = PhoneVerificationTransactionClient & {
  $transaction<T>(callback: (tx: PhoneVerificationTransactionClient) => Promise<T>): Promise<T>;
};

type PhoneVerificationCodeRecord = {
  readonly id: string;
  readonly userId: string;
  readonly phone: string;
  readonly code: string;
  readonly expiresAt: Date;
  readonly verifiedAt: Date | null;
};

const CODE_TTL_SECONDS = 300;
const KOREA_PHONE_PATTERN = /^010\d{8}$/;

@Injectable()
export class PhoneVerificationService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PhoneVerificationPrismaClient,
    @Inject(SMS_SENDER)
    private readonly smsSender: SmsSender,
    @Inject(PHONE_CODE_GENERATOR)
    private readonly codeGenerator: PhoneCodeGenerator,
  ) {}

  async sendVerificationCode(
    currentUser: CurrentUser | undefined,
    input: SendPhoneVerificationCodeInput,
  ): Promise<PhoneVerificationCodePayload> {
    if (!currentUser) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    const phone = normalizeKoreanMobilePhone(input.phone);
    const code = this.codeGenerator();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.phoneVerificationCode.updateMany({
        where: { userId: currentUser.id, verifiedAt: null },
        data: { verifiedAt: now },
      });

      await tx.phoneVerificationCode.create({
        data: {
          userId: currentUser.id,
          phone,
          code,
          expiresAt,
        },
      });
    });

    await this.smsSender.sendVerificationCode(phone, code);

    return { success: true, expiresInSeconds: CODE_TTL_SECONDS };
  }

  async verifyPhoneCode(
    currentUser: CurrentUser | undefined,
    input: VerifyPhoneCodeInput,
  ): Promise<PhoneVerificationPayload> {
    if (!currentUser) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    const phone = normalizeKoreanMobilePhone(input.phone);
    const code = normalizeVerificationCode(input.code);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const record = await tx.phoneVerificationCode.findFirst({
        where: {
          userId: currentUser.id,
          phone,
          code,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        throw new BadRequestException('인증 코드가 올바르지 않습니다');
      }

      if (record.expiresAt.getTime() < now.getTime()) {
        throw new BadRequestException('인증 코드가 만료되었습니다');
      }

      await tx.phoneVerificationCode.update({
        where: { id: record.id },
        data: { verifiedAt: now },
      });

      await tx.user.update({
        where: { id: currentUser.id },
        data: { phone, phoneVerified: true },
      });
    });

    return { success: true };
  }
}

export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function normalizeKoreanMobilePhone(phone: string): string {
  const compact = phone.replace(/[^0-9]/g, '');
  if (!KOREA_PHONE_PATTERN.test(compact)) {
    throw new BadRequestException('올바른 휴대폰 번호를 입력해주세요');
  }

  return `+82${compact.slice(1)}`;
}

function normalizeVerificationCode(code: string): string {
  const compact = code.trim();
  if (!/^\d{6}$/.test(compact)) {
    throw new BadRequestException('인증 코드는 6자리 숫자여야 합니다');
  }

  return compact;
}

export const defaultSmsSender = new ConsoleSmsSender();
