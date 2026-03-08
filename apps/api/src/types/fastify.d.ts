import type { CookieSerializeOptions } from '@fastify/cookie';

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
  }

  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: CookieSerializeOptions,
    ): FastifyReply;

    clearCookie(
      name: string,
      options?: CookieSerializeOptions,
    ): FastifyReply;
  }
}
