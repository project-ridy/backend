import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

export const SUPPORTED_OAUTH_PROVIDERS = ['KAKAO', 'GOOGLE', 'APPLE'] as const;
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

@Injectable()
export class MockableSocialOAuthVerifier implements SocialOAuthVerifier {
  async verify(provider: string, oauthToken: string): Promise<OAuthProfile> {
    await Promise.resolve();

    const normalizedProvider = normalizeOAuthProvider(provider);
    if (oauthToken.trim().length === 0) {
      throw new UnauthorizedException('OAuth 토큰이 필요합니다');
    }

    if (oauthToken.startsWith('mock:')) {
      const [
        ,
        email,
        name = email.split('@')[0],
        providerId = `${normalizedProvider.toLowerCase()}-${email}`,
      ] = oauthToken.split(':');
      if (!email) {
        throw new UnauthorizedException('소셜 로그인에 실패했습니다');
      }

      return {
        provider: normalizedProvider,
        providerId,
        email,
        name,
        imageUrl: null,
      };
    }

    throw new UnauthorizedException('소셜 로그인에 실패했습니다');
  }
}

export function normalizeOAuthProvider(provider: string): OAuthProvider {
  const normalized = provider.trim().toUpperCase();
  if (!SUPPORTED_OAUTH_PROVIDERS.includes(normalized as OAuthProvider)) {
    throw new BadRequestException('지원하지 않는 로그인 방식입니다');
  }

  return normalized as OAuthProvider;
}
