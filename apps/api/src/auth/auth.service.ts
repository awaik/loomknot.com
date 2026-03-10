import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { randomInt, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { users, sessions, type DrizzleDB } from '@loomknot/shared/db';
import type Redis from 'ioredis';
import { DATABASE_TOKEN } from '../database/database.provider';
import { REDIS_TOKEN } from '../redis/redis.provider';
import { JwtService } from './jwt.service';
import type { SendMagicLinkDto, VerifyDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  async sendMagicLink(dto: SendMagicLinkDto): Promise<void> {
    const pin = randomInt(100000, 999999).toString();
    const key = `magic-pin:${dto.email}`;

    await this.redis.set(key, pin, 'EX', 600);

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Loomknot <noreply@send.loomknot.com>',
        to: dto.email,
        subject: `${pin} — your Loomknot sign-in code`,
        html: `<p>Your sign-in code: <strong>${pin}</strong></p><p>This code is valid for 10 minutes.</p>`,
      });
    } else {
      this.logger.warn(`[DEV] Magic PIN for ${dto.email}: ${pin}`);
    }
  }

  async verify(dto: VerifyDto, userAgent?: string, ipAddress?: string) {
    const key = `magic-pin:${dto.email}`;
    const storedPin = await this.redis.get(key);

    if (!storedPin || storedPin !== dto.pin) {
      throw new UnauthorizedException('Invalid or expired PIN');
    }

    await this.redis.del(key);

    // Find or create user
    let user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) {
      const [newUser] = await this.db
        .insert(users)
        .values({ email: dto.email })
        .returning();
      user = newUser!;
    }

    // Create session → sign refresh token → store hash
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: 'pending',
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      })
      .returning();

    const refreshToken = await this.jwt.signRefreshToken({
      sub: user.id,
      sid: session!.id,
      ver: user.tokenVersion,
    });

    await this.db
      .update(sessions)
      .set({ tokenHash: this.hashToken(refreshToken) })
      .where(eq(sessions.id, session!.id));

    const accessToken = await this.jwt.signAccessToken({
      sub: user.id,
      email: user.email,
      ver: user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        onboardingDone: user.onboardingDone,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = await this.jwt.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, payload.sid),
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    if (session.tokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Token mismatch');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Token revoked');
    }

    const accessToken = await this.jwt.signAccessToken({
      sub: user.id,
      email: user.email,
      ver: user.tokenVersion,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        onboardingDone: user.onboardingDone,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      onboardingDone: user.onboardingDone,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    let payload;
    try {
      payload = await this.jwt.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    await this.db.delete(sessions).where(eq(sessions.id, payload.sid));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
