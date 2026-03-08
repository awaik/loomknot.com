import { z } from 'zod';

export const sendMagicLinkSchema = z.object({
  email: z.string().email(),
});

export type SendMagicLinkDto = z.infer<typeof sendMagicLinkSchema>;

export const verifySchema = z.object({
  email: z.string().email(),
  pin: z.string().length(6),
});

export type VerifyDto = z.infer<typeof verifySchema>;
