import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '@loomknot/shared';
import { api } from '@/lib/api';

export interface TaskLog {
  id: string;
  taskId: string;
  level: string;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  result: unknown;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  logs?: TaskLog[];
}

export interface TaskFilters {
  status?: string;
  projectId?: string;
  limit?: number;
  cursor?: string;
}

interface CreateTaskInput {
  title: string;
  prompt: string;
  projectId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string;
}

interface UpdateTaskInput {
  status?: 'pending' | 'in_progress' | 'done' | 'failed';
  result?: unknown;
  log?: string;
}

export function useTasks(filters?: TaskFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();

  return useQuery<PaginatedResponse<TaskResponse>>({
    queryKey: ['tasks', filters],
    queryFn: () =>
      api<PaginatedResponse<TaskResponse>>(`/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useTask(id: string | undefined) {
  return useQuery<TaskResponse>({
    queryKey: ['task', id],
    queryFn: () => api<TaskResponse>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api<TaskResponse>('/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api<TaskResponse>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
