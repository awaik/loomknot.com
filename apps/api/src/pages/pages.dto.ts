import { z } from 'zod';
import { KNOWN_TYPES_DESCRIPTION } from '@loomknot/shared/blocks';

// --- Block schema (used inside create/update) ---
const blockSchema = z.object({
  type: z.string().min(1).max(50).describe(`Block type. ${KNOWN_TYPES_DESCRIPTION}`),
  content: z.record(z.unknown()).default({}),
  agentData: z.record(z.unknown()).optional(),
  sourceMemoryIds: z.array(z.string()).optional(),
});

// --- Create Page ---
export const createPageSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  blocks: z.array(blockSchema).default([]),
});

export type CreatePageDto = z.infer<typeof createPageSchema>;

// --- Update Page ---
const updateBlockSchema = z.object({
  id: z.string().optional(),
  action: z.enum(['delete']).optional(),
  type: z.string().min(1).max(50).describe(`Block type. ${KNOWN_TYPES_DESCRIPTION}`).optional(),
  content: z.record(z.unknown()).optional(),
  agentData: z.record(z.unknown()).nullable().optional(),
  sourceMemoryIds: z.array(z.string()).nullable().optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  blocks: z.array(updateBlockSchema).optional(),
});

export type UpdatePageDto = z.infer<typeof updatePageSchema>;
