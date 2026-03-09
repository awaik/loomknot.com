import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import type { MemoryLevel, MemorySource, PaginatedResponse } from '@loomknot/shared';

export interface MemoryResponse {
  id: string;
  projectId: string;
  userId: string | null;
  level: MemoryLevel;
  category: string;
  key: string;
  value: unknown;
  summary: string | null;
  source: MemorySource;
  apiKeyId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryFilters {
  category?: string;
  level?: MemoryLevel;
  limit?: number;
  cursor?: string;
}

interface CreateMemoryInput {
  category: string;
  key: string;
  value: unknown;
  level?: MemoryLevel;
  summary?: string;
}

interface BulkWriteInput {
  memories: CreateMemoryInput[];
}

interface UpdateMemoryInput {
  value?: unknown;
  summary?: string;
  level?: MemoryLevel;
}

export function useMemories(
  projectId: string | undefined,
  filters?: MemoryFilters,
) {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.level) params.set('level', filters.level);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();

  return useQuery<PaginatedResponse<MemoryResponse>>({
    queryKey: ['memories', projectId, filters],
    queryFn: () =>
      projectApi<PaginatedResponse<MemoryResponse>>(
        projectId!,
        `/projects/${projectId}/memories${qs ? `?${qs}` : ''}`,
      ),
    enabled: !!projectId,
  });
}

export function useSearchMemories(
  projectId: string | undefined,
  query: string,
) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);

  return useQuery<MemoryResponse[]>({
    queryKey: ['memories-search', projectId, query],
    queryFn: () =>
      projectApi<MemoryResponse[]>(
        projectId!,
        `/projects/${projectId}/memories/search?${params.toString()}`,
      ),
    enabled: !!projectId && query.length > 0,
  });
}

export function useCreateMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMemoryInput) =>
      projectApi<MemoryResponse>(projectId, `/projects/${projectId}/memories`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });
}

export function useBulkWriteMemories(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkWriteInput) =>
      projectApi(projectId, `/projects/${projectId}/memories/bulk`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });
}

export function useUpdateMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memoryId,
      input,
    }: {
      memoryId: string;
      input: UpdateMemoryInput;
    }) =>
      projectApi<MemoryResponse>(projectId, `/memories/${memoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });
}

export function useDeleteMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) =>
      projectApi(projectId, `/memories/${memoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });
}
