import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

export const SUPPORTED_OAUTH_PROVIDERS = ['KAKAO', 'GOOGLE'] as const;
export type OAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export type OAuthProfile = {
  readonly provider: OAuthProvider;
  readonly providerId: string;
  readonly email: string;
  readonly name: string;
  readonly imageUrl: string | null;
};

export interface SocialOAuthVerifier {
  verify(provider: string, oauthToken: string): Promise<OAuthProfile>;
}

type KakaoUserMeResponse = {
  readonly id?: number | string;
  readonly kakao_account?: {
    readonly email?: string;
    readonly profile?: {
      readonly nickname?: string;
      readonly profile_image_url?: string;
    };
  };
};

type GoogleTokenInfoResponse = {
  readonly sub?: string;
  readonly email?: string;
  readonly name?: string;
  readonly picture?: string;
};

@Injectable()
export class MockableSocialOAuthVerifier implements SocialOAuthVerifier {
  async verify(provider: string, oauthToken: string): Promise<OAuthProfile> {
    const normalizedProvider = normalizeOAuthProvider(provider);
    const token = oauthToken.trim();

    if (token.length === 0) {
      throw new UnauthorizedException('OAuth 토큰이 필요합니다');
    }

    if (token.startsWith('mock:')) {
      return verifyMockToken(normalizedProvider, token);
    }

    switch (normalizedProvider) {
      case 'KAKAO':
        return verifyKakaoToken(token);
      case 'GOOGLE':
        return verifyGoogleToken(token);
    }
  }
}

export function normalizeOAuthProvider(provider: string): OAuthProvider {
  const normalized = provider.trim().toUpperCase();
  if (!SUPPORTED_OAUTH_PROVIDERS.includes(normalized as OAuthProvider)) {
    throw new BadRequestException('지원하지 않는 로그인 방식입니다');
  }

  return normalized as OAuthProvider;
}

function verifyMockToken(provider: OAuthProvider, token: string): OAuthProfile {
  const [, email, name = email.split('@')[0], providerId = `${provider.toLowerCase()}-${email}`] =
    token.split(':');
  if (!email) {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }

  return {
    provider,
    providerId,
    email,
    name,
    imageUrl: null,
  };
}

async function verifyKakaoToken(token: string): Promise<OAuthProfile> {
  const data = await fetchJson<KakaoUserMeResponse>('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const providerId = data.id?.toString();
  const email = data.kakao_account?.email;
  if (!providerId || !email) {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }

  return {
    provider: 'KAKAO',
    providerId,
    email,
    name: data.kakao_account?.profile?.nickname ?? email.split('@')[0],
    imageUrl: data.kakao_account?.profile?.profile_image_url ?? null,
  };
}

async function verifyGoogleToken(token: string): Promise<OAuthProfile> {
  const data = await fetchJson<GoogleTokenInfoResponse>(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
  );

  if (!data.sub || !data.email) {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }

  return {
    provider: 'GOOGLE',
    providerId: data.sub,
    email: data.email,
    name: data.name ?? data.email.split('@')[0],
    imageUrl: data.picture ?? null,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }

  if (!response.ok) {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }
}
