import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAccessToken(token);
      (request as any).user = {
        id: payload.sub,
        email: payload.email,
        tokenVersion: payload.ver,
      };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const auth = request.headers.authorization;
    if (!auth) return undefined;

    const [type, token] = auth.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
