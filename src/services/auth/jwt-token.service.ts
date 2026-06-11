import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtTokenType = 'access' | 'refresh';

export type JwtPayload = {
  readonly sub: string;
  readonly companyId: string;
  readonly role: string;
  readonly email: string;
  readonly type: JwtTokenType;
  readonly iat: number;
  readonly exp: number;
};

export type TokenPairPayload = Omit<JwtPayload, 'type' | 'iat' | 'exp'>;

export type AuthTokenPair = {
  readonly accessToken: string;
  readonly refreshToken: string;
};

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

export const JWT_SECRET = 'JWT_SECRET';

@Injectable()
export class JwtTokenService {
  constructor(@Inject(JWT_SECRET) private readonly secret: string) {}

  issueTokenPair(payload: TokenPairPayload): AuthTokenPair {
    return {
      accessToken: this.sign({ ...payload, type: 'access' }, ACCESS_TOKEN_TTL_SECONDS),
      refreshToken: this.sign({ ...payload, type: 'refresh' }, REFRESH_TOKEN_TTL_SECONDS),
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    const payload = this.verify(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return payload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    const payload = this.verify(token);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return payload;
  }

  private sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSeconds: number): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const body: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + ttlSeconds,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedBody = base64UrlEncode(JSON.stringify(body));
    const signature = this.signature(`${encodedHeader}.${encodedBody}`);

    return `${encodedHeader}.${encodedBody}.${signature}`;
  }

  private verify(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    const [encodedHeader, encodedBody, signature] = parts as [string, string, string];
    const expectedSignature = this.signature(`${encodedHeader}.${encodedBody}`);

    if (!safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    const payload = parsePayload(encodedBody);
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }

    return payload;
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function parsePayload(encodedBody: string): JwtPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(encodedBody, 'base64url').toString('utf8'),
    ) as Partial<JwtPayload>;
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.companyId !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.email !== 'string' ||
      (parsed.type !== 'access' && parsed.type !== 'refresh') ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      throw new BadRequestException();
    }

    return parsed as JwtPayload;
  } catch {
    throw new UnauthorizedException('유효하지 않은 토큰입니다');
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
