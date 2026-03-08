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
  @HttpCode(HttpStatus.OK)
  async sendMagicLink(
    @Body(new ZodValidationPipe(sendMagicLinkSchema)) dto: SendMagicLinkDto,
  ) {
    await this.auth.sendMagicLink(dto);
    return { ok: true };
  }

  @Public()
  @Post('verify')
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

    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
