import { z } from 'zod';

// --- Create Task ---
export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  prompt: z.string().min(1),
  projectId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

// --- Update Task ---
export const updateTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'failed']).optional(),
  result: z.unknown().optional(),
  log: z.string().optional(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

// --- List Tasks Query ---
export const listTasksQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'failed']).optional(),
  projectId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
