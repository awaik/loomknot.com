import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EMAIL_FROM } from '@loomknot/shared/constants';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type SendMagicLinkDto,
  sendMagicLinkSchema,
  type VerifyDto,
  verifySchema,
} from './dto/auth.dto';

const REFRESH_COOKIE = 'lk_refresh';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('send-magic-link')
  @Throttle({ short: { ttl: 60_000, limit: 3 }, long: { ttl: 600_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async sendMagicLink(
    @Body(new ZodValidationPipe(sendMagicLinkSchema)) dto: SendMagicLinkDto,
  ) {
    await this.auth.sendMagicLink(dto);
    return { ok: true };
  }

  @Public()
  @Post('verify')
  @Throttle({ short: { ttl: 60_000, limit: 5 }, long: { ttl: 600_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body(new ZodValidationPipe(verifySchema)) dto: VerifyDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.verify(
      dto,
      req.headers['user-agent'],
      req.ip,
    );

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest) {
    const refreshToken = (req.cookies as Record<string, string>)?.[
      REFRESH_COOKIE
    ];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    return this.auth.refresh(refreshToken);
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.id);
  }

  @Public()
  @Get('test-email')
  async testEmail() {
    if (!process.env.RESEND_API_KEY) {
      return { ok: false, error: 'RESEND_API_KEY not set' };
    }
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: 'awaiking44@gmail.com',
      subject: 'Loomknot test email',
      html: '<p>This is a test email from Loomknot.</p>',
    });
    return { ok: !error, data, error };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.[
      REFRESH_COOKIE
    ];
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }

    const { maxAge: _, ...clearOptions } = COOKIE_OPTIONS;
    reply.clearCookie(REFRESH_COOKIE, clearOptions);
  }
}
