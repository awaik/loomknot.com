import { z } from 'zod';

// --- List Negotiations Query ---
export const listNegotiationsQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
});

export type ListNegotiationsQuery = z.infer<typeof listNegotiationsQuerySchema>;

// --- Propose Option ---
export const proposeOptionSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  proposedValue: z.unknown(),
  reasoning: z.string().optional(),
});

export type ProposeOptionDto = z.infer<typeof proposeOptionSchema>;

// --- Vote ---
export const voteSchema = z.object({
  vote: z.enum(['approve', 'reject', 'neutral']),
  comment: z.string().optional(),
});

export type VoteDto = z.infer<typeof voteSchema>;
