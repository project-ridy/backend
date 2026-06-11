import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import type { OAuthProfile, SocialOAuthVerifier } from './social-oauth.verifier';

type MockPrisma = {
  user: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  inviteCode: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

type UserCreateCall = {
  readonly data: {
    readonly companyId: string;
    readonly email: string;
    readonly name: string;
    readonly provider: string;
    readonly providerId: string;
    readonly employeeId: string | null;
  };
  readonly include: object;
};

type MockSocialOAuthVerifier = SocialOAuthVerifier & {
  readonly verify: jest.MockedFunction<SocialOAuthVerifier['verify']>;
};

function firstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly (readonly unknown[])[];
  return calls[0]?.[0] as T;
}

const now = new Date('2026-01-01T00:00:00Z');

const company = {
  id: 'company-1',
  name: '테크스타터',
  inviteCode: 'TECH01',
  domain: 'techstarter.co.kr',
  plan: 'PRO',
  maxMembers: 50,
  createdAt: now,
  updatedAt: now,
  _count: { users: 10 },
};

const user = {
  id: 'user-1',
  companyId: 'company-1',
  employeeId: 'E-001',
  email: 'user@techstarter.co.kr',
  name: '정원',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO',
  providerId: 'kakao-1',
  role: 'PASSENGER',
  rating: 0,
  rideCount: 0,
  company,
  createdAt: now,
  updatedAt: now,
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
  createdAt: now,
};

const profile: OAuthProfile = {
  provider: 'KAKAO',
  providerId: 'kakao-1',
  email: 'user@techstarter.co.kr',
  name: '정원',
  imageUrl: null,
};

function createPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    inviteCode: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback: (tx: MockPrisma) => Promise<unknown>) =>
    callback(prisma),
  );

  return prisma;
}

function createVerifier(profileResult: OAuthProfile = profile): MockSocialOAuthVerifier {
  return {
    verify: jest
      .fn<ReturnType<SocialOAuthVerifier['verify']>, Parameters<SocialOAuthVerifier['verify']>>()
      .mockResolvedValue(profileResult),
  };
}

describe('AuthService', () => {
  let prisma: MockPrisma;
  let jwtTokenService: JwtTokenService;
  let verifier: MockSocialOAuthVerifier;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrisma();
    jwtTokenService = new JwtTokenService('test-secret');
    verifier = createVerifier();
    service = new AuthService(prisma, jwtTokenService, verifier);
  });

  describe('login', () => {
    it('기존 가입 유저에게 access/refresh token을 발급한다', async () => {
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.login({ provider: 'kakao', oauthToken: 'valid-token' });

      expect(verifier.verify.mock.calls[0]).toEqual(['kakao', 'valid-token']);
      expect(result.user.id).toBe(user.id);
      expect(result.user.company?.memberCount).toBe(10);
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(jwtTokenService.verifyAccessToken(result.accessToken).sub).toBe('user-1');
    });

    it('미가입 이메일이면 NotFoundException을 던진다', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ provider: 'google', oauthToken: 'valid-token' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('빈 OAuth 토큰이면 UnauthorizedException을 던진다', async () => {
      await expect(service.login({ provider: 'kakao', oauthToken: '' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('지원하지 않는 provider면 BadRequestException을 던진다', async () => {
      await expect(
        service.login({ provider: 'naver', oauthToken: 'token' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('joinWithInviteCode', () => {
    it('유효한 초대 코드와 소셜 프로필로 유저를 생성하고 초대 코드 사용 횟수를 증가시킨다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue(inviteCode);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue(company);
      prisma.user.create.mockResolvedValue(user);
      prisma.inviteCode.update.mockResolvedValue({ ...inviteCode, currentUses: 1 });

      const result = await service.joinWithInviteCode({
        inviteCode: 'abc123',
        provider: 'kakao',
        oauthToken: 'valid-token',
        employeeId: 'E-001',
      });

      expect(result.user.id).toBe(user.id);
      expect(result.user.company?.memberCount).toBe(10);
      const createCall = firstMockArg<UserCreateCall>(prisma.user.create);
      expect(createCall.data).toMatchObject({
        companyId: 'company-1',
        email: 'user@techstarter.co.kr',
        name: '정원',
        provider: 'KAKAO',
        providerId: 'kakao-1',
        employeeId: 'E-001',
      });
      expect(createCall.include).toBeDefined();
      expect(prisma.inviteCode.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { currentUses: { increment: 1 } },
      });
    });

    it('이미 가입된 이메일이면 ConflictException을 던진다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue(inviteCode);
      prisma.user.findFirst.mockResolvedValue(user);

      await expect(
        service.joinWithInviteCode({
          inviteCode: 'ABC123',
          provider: 'kakao',
          oauthToken: 'valid-token',
          employeeId: null,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('회사 정원이 초과되면 BadRequestException을 던진다', async () => {
      prisma.inviteCode.findFirst.mockResolvedValue(inviteCode);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue({ ...company, _count: { users: 50 } });

      await expect(
        service.joinWithInviteCode({
          inviteCode: 'ABC123',
          provider: 'kakao',
          oauthToken: 'valid-token',
          employeeId: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('유효한 refresh token으로 새 token pair를 발급한다', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      const initial = jwtTokenService.issueTokenPair({
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      });

      const result = await service.refreshToken(initial.refreshToken);

      expect(result.user.id).toBe(user.id);
      expect(result.user.company?.memberCount).toBe(10);
      expect(jwtTokenService.verifyAccessToken(result.accessToken).sub).toBe('user-1');
    });

    it('access token으로 refresh를 시도하면 UnauthorizedException을 던진다', async () => {
      const initial = jwtTokenService.issueTokenPair({
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      });

      await expect(service.refreshToken(initial.accessToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
