import { z } from 'zod';

// --- Create Project ---
export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  vertical: z.string().min(1).max(50).default('general'),
  isPublic: z.boolean().default(false),
  settings: z.record(z.unknown()).default({}),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

// --- Update Project ---
export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

// --- Create Invite ---
export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'member', 'viewer']).default('member'),
});

export type CreateInviteDto = z.infer<typeof createInviteSchema>;
