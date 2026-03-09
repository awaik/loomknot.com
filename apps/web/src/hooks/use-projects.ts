import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, projectApi } from '@/lib/api';

export interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface ProjectResponse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  vertical: string;
  ownerId: string;
  isPublic: boolean;
  settings: Record<string, unknown>;
  context: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _counts?: {
    members: number;
    pages: number;
    memories: number;
  };
}

interface CreateProjectInput {
  title: string;
  description?: string;
  vertical?: string;
}

interface UpdateProjectInput {
  title?: string;
  description?: string;
  vertical?: string;
  isPublic?: boolean;
  context?: string;
}

export function useProjects() {
  return useQuery<ProjectResponse[]>({
    queryKey: ['projects'],
    queryFn: () => api<ProjectResponse[]>('/projects'),
  });
}

export function useProject(id: string | undefined) {
  return useQuery<ProjectResponse>({
    queryKey: ['project', id],
    queryFn: () => projectApi<ProjectResponse>(id!, `/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api<ProjectResponse>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      projectApi<ProjectResponse>(id, `/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      projectApi(id, `/projects/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
