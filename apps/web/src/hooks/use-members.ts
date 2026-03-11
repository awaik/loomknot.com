import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

export interface Member {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface InviteInput {
  email: string;
  role?: string;
}

interface InviteResponse {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: string;
}

export function useMembers(projectId: string | undefined) {
  return useQuery<Member[]>({
    queryKey: ['members', projectId],
    queryFn: () =>
      projectApi<Member[]>(projectId!, `/projects/${projectId}/members`),
    enabled: !!projectId,
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      projectApi(projectId, `/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteInput) =>
      projectApi<InviteResponse>(projectId, `/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['invites', projectId] });
    },
  });
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  lastSentAt: string;
  createdAt: string;
  updatedAt: string | null;
}

export function useProjectInvites(projectId: string | undefined, enabled: boolean) {
  return useQuery<PendingInvite[]>({
    queryKey: ['invites', projectId],
    queryFn: () =>
      projectApi<PendingInvite[]>(projectId!, `/projects/${projectId}/invites`),
    enabled: !!projectId && enabled,
  });
}

export function useResendInvite(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      projectApi(projectId, `/projects/${projectId}/invites/${inviteId}/resend`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectId] });
    },
  });
}
