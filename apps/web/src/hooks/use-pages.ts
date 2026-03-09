import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import type { PageStatus } from '@loomknot/shared';

export interface PageBlock {
  id: string;
  pageId: string;
  type: string;
  content: Record<string, unknown>;
  agentData: Record<string, unknown> | null;
  sourceMemoryIds: string[] | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  description: string | null;
  status: PageStatus;
  sortOrder: number;
  createdBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  blocks?: PageBlock[];
}

interface CreatePageInput {
  title: string;
  slug?: string;
  description?: string;
  status?: PageStatus;
  blocks?: Array<{
    type: string;
    content: Record<string, unknown>;
    sortOrder?: number;
  }>;
}

interface UpdatePageInput {
  title?: string;
  description?: string;
  status?: PageStatus;
  sortOrder?: number;
}

export function useProjectPages(projectId: string | undefined) {
  return useQuery<PageResponse[]>({
    queryKey: ['pages', projectId],
    queryFn: () =>
      projectApi<PageResponse[]>(projectId!, `/projects/${projectId}/pages`),
    enabled: !!projectId,
  });
}

export function useProjectPage(
  projectId: string | undefined,
  pageId: string | undefined,
) {
  return useQuery<PageResponse>({
    queryKey: ['page', pageId],
    queryFn: () =>
      projectApi<PageResponse>(projectId!, `/pages/${pageId}`),
    enabled: !!projectId && !!pageId,
  });
}

export function useCreatePage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePageInput) =>
      projectApi<PageResponse>(projectId, `/projects/${projectId}/pages`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', projectId] });
    },
  });
}

export function useUpdatePage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pageId,
      input,
    }: {
      pageId: string;
      input: UpdatePageInput;
    }) =>
      projectApi<PageResponse>(projectId, `/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pages', projectId] });
    },
  });
}

export function useDeletePage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) =>
      projectApi(projectId, `/pages/${pageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', projectId] });
    },
  });
}
