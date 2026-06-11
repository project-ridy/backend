import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CurrentUser } from '../../graphql/context';
import { InviteCodeService } from './invite-code.service';

type InviteCodeCreateCall = {
  readonly data: {
    readonly companyId: string;
    readonly code: string;
    readonly createdBy: string;
    readonly maxUses: number;
    readonly isActive: boolean;
  };
  readonly include: object;
};

type InviteCodeFindFirstCall = {
  readonly where: { readonly code: string };
  readonly include: object;
};

type InviteCodeUpdateCall = {
  readonly where: { readonly id: string };
  readonly data: { readonly isActive: boolean };
  readonly include: object;
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

type MockPrisma = {
  inviteCode: {
    count: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
  };
};

const adminUser: CurrentUser = {
  id: 'admin-1',
  companyId: 'company-1',
  role: 'ADMIN',
};

const passengerUser: CurrentUser = {
  id: 'user-1',
  companyId: 'company-1',
  role: 'PASSENGER',
};

const company = {
  id: 'company-1',
  name: '테크스타터',
  inviteCode: 'TECH01',
  domain: 'techstarter.co.kr',
  plan: 'PRO',
  maxMembers: 50,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  _count: { users: 10 },
};

const inviteCode = {
  id: 'invite-1',
  companyId: 'company-1',
  code: 'ABC123',
  createdBy: 'admin-1',
  maxUses: 10,
  currentUses: 0,
  expiresAt: null,
  isActive: true,
  company,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('InviteCodeService', () => {
  let service: InviteCodeService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      inviteCode: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
    };

    service = new InviteCodeService(prisma as unknown as Prisma.TransactionClient);
  });

  describe('generateInviteCode', () => {
    it('기본 옵션으로 6자리 초대 코드를 발급한다', async () => {
      prisma.inviteCode.count.mockResolvedValue(0);
      prisma.inviteCode.findFirst.mockResolvedValue(null);
      prisma.inviteCode.create.mockResolvedValue(inviteCode);

      const result = await service.generateInviteCode(adminUser, {});

      expect(result).toBe(inviteCode);
      expect(prisma.inviteCode.create).toHaveBeenCalledTimes(1);
      const createCall = firstMockArg<InviteCodeCreateCall>(prisma.inviteCode.create);
      expect(createCall.data).toMatchObject({
        companyId: 'company-1',
        createdBy: 'admin-1',
        maxUses: 10,
        isActive: true,
      });
      expect(createCall.data.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(createCall.include).toBeDefined();
    });

    it('미인증 사용자는 초대 코드를 발급할 수 없다', async () => {
      await expect(service.generateInviteCode(undefined, {})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('관리자가 아닌 사용자는 초대 코드를 발급할 수 없다', async () => {
      await expect(service.generateInviteCode(passengerUser, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('maxUses가 100을 초과하면 실패한다', async () => {
      await expect(service.generateInviteCode(adminUser, { maxUses: 101 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('활성 코드가 10개 이상이면 실패한다', async () => {
      prisma.inviteCode.count.mockResolvedValue(10);

      await expect(service.generateInviteCode(adminUser, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('validateInviteCode', () => {
    it('유효한 코드를 검증하고 회사 정보를 반환한다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue(inviteCode);

      const result = await service.validateInviteCode(' abc123 ');

      expect(result).toBe(inviteCode);
      expect(prisma.inviteCode.findFirst).toHaveBeenCalledTimes(1);
      const findFirstCall = firstMockArg<InviteCodeFindFirstCall>(prisma.inviteCode.findFirst);
      expect(findFirstCall.where).toEqual({ code: 'ABC123' });
      expect(findFirstCall.include).toBeDefined();
    });

    it('존재하지 않는 코드는 실패한다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue(null);

      await expect(service.validateInviteCode('UNKNOWN')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('만료된 코드는 실패한다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue({
        ...inviteCode,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      });

      await expect(service.validateInviteCode('ABC123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('deactivateInviteCode', () => {
    it('관리자가 자기 회사의 초대 코드를 비활성화한다', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(inviteCode);
      prisma.inviteCode.update.mockResolvedValue({ ...inviteCode, isActive: false });

      const result = await service.deactivateInviteCode(adminUser, 'invite-1');

      expect(result.isActive).toBe(false);
      expect(prisma.inviteCode.update).toHaveBeenCalledTimes(1);
      const updateCall = firstMockArg<InviteCodeUpdateCall>(prisma.inviteCode.update);
      expect(updateCall.where).toEqual({ id: 'invite-1' });
      expect(updateCall.data).toEqual({ isActive: false });
      expect(updateCall.include).toBeDefined();
    });

    it('다른 회사 초대 코드는 비활성화할 수 없다', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue({
        ...inviteCode,
        companyId: 'other-company',
      });

      await expect(service.deactivateInviteCode(adminUser, 'invite-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
