import { z } from 'zod';

export const createMemorySchema = z.object({
  category: z.string().min(1).max(100),
  key: z.string().min(1).max(255),
  value: z.unknown(),
  summary: z.string().max(5000).optional(),
  level: z.enum(['private', 'project']).default('private'),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;

export const bulkWriteSchema = z.object({
  items: z.array(createMemorySchema).min(1).max(100),
});

export type BulkWriteDto = z.infer<typeof bulkWriteSchema>;

export const updateMemorySchema = z.object({
  value: z.unknown().optional(),
  summary: z.string().max(5000).optional(),
  level: z.enum(['private', 'project', 'public']).optional(),
});

export type UpdateMemoryDto = z.infer<typeof updateMemorySchema>;

export const listMemoriesQuerySchema = z.object({
  category: z.string().optional(),
  level: z.enum(['private', 'project', 'public']).optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;

export const searchMemoriesQuerySchema = z.object({
  query: z.string().min(1).max(500),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type SearchMemoriesQuery = z.infer<typeof searchMemoriesQuerySchema>;
