import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  ver: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  ver: number;
}

@Injectable()
export class JwtService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;

  constructor() {
    const accessKey =
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'dev-jwt-access-secret-change-in-production';
    const refreshKey =
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      'dev-jwt-refresh-secret-change-in-production';

    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ email: payload.email, ver: payload.ver })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.accessSecret);
  }

  async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return new SignJWT({ sid: payload.sid, ver: payload.ver })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.refreshSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    return {
      sub: payload.sub!,
      email: payload['email'] as string,
      ver: payload['ver'] as number,
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.refreshSecret);
    return {
      sub: payload.sub!,
      sid: payload['sid'] as string,
      ver: payload['ver'] as number,
    };
  }
}
