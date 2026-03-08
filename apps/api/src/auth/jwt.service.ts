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
  private readonly secret: Uint8Array;

  constructor() {
    const key = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
    this.secret = new TextEncoder().encode(key);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ email: payload.email, ver: payload.ver })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.secret);
  }

  async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return new SignJWT({ sid: payload.sid, ver: payload.ver })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return {
      sub: payload.sub!,
      email: payload['email'] as string,
      ver: payload['ver'] as number,
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return {
      sub: payload.sub!,
      sid: payload['sid'] as string,
      ver: payload['ver'] as number,
    };
  }
}
