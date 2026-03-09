import { z } from 'zod';

// --- Create API Key ---
export const createApiKeySchema = z.object({
  label: z.string().max(255).optional(),
  projectId: z.string().optional(),
});

export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;
