import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import type { CurrentUser } from '../../common/context/graphql-context';
import { PhoneVerificationService } from './phone-verification.service';
import type { SmsSender } from './sms.sender';

type MockPrisma = {
  phoneVerificationCode: {
    updateMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  user: {
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockSmsSender = SmsSender & {
  readonly sendVerificationCode: jest.MockedFunction<SmsSender['sendVerificationCode']>;
};

type CodeCreateCall = {
  readonly data: {
    readonly userId: string;
    readonly phone: string;
    readonly code: string;
    readonly expiresAt: Date;
  };
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const currentUser: CurrentUser = {
  id: 'user-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const activeCode = {
  id: 'code-1',
  userId: 'user-1',
  phone: '+821012345678',
  code: '123456',
  expiresAt: new Date(Date.now() + 3 * 60 * 1000),
  verifiedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function createPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    phoneVerificationCode: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback: (tx: MockPrisma) => Promise<unknown>) =>
    callback(prisma),
  );

  return prisma;
}

function createSmsSender(): MockSmsSender {
  return {
    sendVerificationCode: jest
      .fn<
        ReturnType<SmsSender['sendVerificationCode']>,
        Parameters<SmsSender['sendVerificationCode']>
      >()
      .mockResolvedValue(undefined),
  };
}

describe('PhoneVerificationService', () => {
  let prisma: MockPrisma;
  let smsSender: MockSmsSender;
  let service: PhoneVerificationService;

  beforeEach(() => {
    prisma = createPrisma();
    smsSender = createSmsSender();
    service = new PhoneVerificationService(prisma, smsSender, () => '123456');
  });

  describe('sendVerificationCode', () => {
    it('기존 미인증 코드를 폐기하고 새 6자리 코드를 저장한 뒤 SMS를 발송한다', async () => {
      prisma.phoneVerificationCode.create.mockResolvedValue(activeCode);

      const result = await service.sendVerificationCode(currentUser, { phone: '010-1234-5678' });

      expect(result).toEqual({ success: true, expiresInSeconds: 300 });
      expect(prisma.phoneVerificationCode.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', verifiedAt: null },
        data: { verifiedAt: expect.any(Date) as Date },
      });
      const createCall = firstMockArg<CodeCreateCall>(prisma.phoneVerificationCode.create);
      expect(createCall.data).toMatchObject({
        userId: 'user-1',
        phone: '+821012345678',
        code: '123456',
      });
      expect(createCall.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(smsSender.sendVerificationCode.mock.calls[0]).toEqual(['+821012345678', '123456']);
    });

    it('미인증 사용자는 인증 코드를 발송할 수 없다', async () => {
      await expect(
        service.sendVerificationCode(undefined, { phone: '010-1234-5678' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('잘못된 휴대폰 번호는 실패한다', async () => {
      await expect(
        service.sendVerificationCode(currentUser, { phone: '123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifyPhoneCode', () => {
    it('유효한 코드를 검증하고 유저의 phoneVerified를 true로 바꾼다', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue(activeCode);
      prisma.phoneVerificationCode.update.mockResolvedValue({
        ...activeCode,
        verifiedAt: new Date(),
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        phone: '+821012345678',
        phoneVerified: true,
      });

      const result = await service.verifyPhoneCode(currentUser, {
        phone: '010-1234-5678',
        code: '123456',
      });

      expect(result.success).toBe(true);
      expect(prisma.phoneVerificationCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { verifiedAt: expect.any(Date) as Date },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '+821012345678', phoneVerified: true },
      });
    });

    it('코드가 일치하지 않으면 실패한다', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyPhoneCode(currentUser, { phone: '010-1234-5678', code: '000000' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('만료된 코드는 실패한다', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({
        ...activeCode,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyPhoneCode(currentUser, { phone: '010-1234-5678', code: '123456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
