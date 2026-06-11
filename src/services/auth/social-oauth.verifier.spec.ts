import { UnauthorizedException } from '@nestjs/common';

import { MockableSocialOAuthVerifier } from './social-oauth.verifier';

type FetchMock = jest.MockedFunction<typeof fetch>;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      await Promise.resolve();
      return body;
    },
  } as Response;
}

function appleIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('MockableSocialOAuthVerifier', () => {
  const originalFetch = global.fetch;
  let fetchMock: FetchMock;
  let verifier: MockableSocialOAuthVerifier;

  beforeEach(() => {
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;
    verifier = new MockableSocialOAuthVerifier();
    delete process.env.APPLE_CLIENT_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('mock 토큰은 외부 호출 없이 프로필로 변환한다', async () => {
    const result = await verifier.verify('kakao', 'mock:user@example.com:정원:kakao-user-1');

    expect(result).toEqual({
      provider: 'KAKAO',
      providerId: 'kakao-user-1',
      email: 'user@example.com',
      name: '정원',
      imageUrl: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Kakao access token을 /v2/user/me 응답으로 검증한다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 12345,
        kakao_account: {
          email: 'kakao@example.com',
          profile: {
            nickname: '카카오유저',
            profile_image_url: 'https://example.com/kakao.png',
          },
        },
      }),
    );

    const result = await verifier.verify('kakao', 'kakao-access-token');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://kapi.kakao.com/v2/user/me');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer kakao-access-token' },
    });
    expect(result).toEqual({
      provider: 'KAKAO',
      providerId: '12345',
      email: 'kakao@example.com',
      name: '카카오유저',
      imageUrl: 'https://example.com/kakao.png',
    });
  });

  it('Google access token을 tokeninfo 응답으로 검증한다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        sub: 'google-sub-1',
        email: 'google@example.com',
        name: '구글유저',
        picture: 'https://example.com/google.png',
      }),
    );

    const result = await verifier.verify('google', 'google-access-token');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://oauth2.googleapis.com/tokeninfo?access_token=google-access-token',
    );
    expect(result).toEqual({
      provider: 'GOOGLE',
      providerId: 'google-sub-1',
      email: 'google@example.com',
      name: '구글유저',
      imageUrl: 'https://example.com/google.png',
    });
  });

  it('Apple identity token payload를 프로필로 변환한다', async () => {
    const token = appleIdToken({
      iss: 'https://appleid.apple.com',
      sub: 'apple-sub-1',
      email: 'apple@example.com',
    });

    const result = await verifier.verify('apple', token);

    expect(result).toEqual({
      provider: 'APPLE',
      providerId: 'apple-sub-1',
      email: 'apple@example.com',
      name: 'apple',
      imageUrl: null,
    });
  });

  it('provider 검증 실패 응답은 UnauthorizedException으로 변환한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_token' }, 401));

    await expect(verifier.verify('kakao', 'bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
