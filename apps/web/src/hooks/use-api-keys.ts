import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ApiKeyResponse {
  id: string;
  userId: string;
  keyPrefix: string;
  label: string | null;
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string;
}

interface CreateApiKeyInput {
  label?: string;
}

export function useApiKeys() {
  return useQuery<ApiKeyResponse[]>({
    queryKey: ['api-keys'],
    queryFn: () => api<ApiKeyResponse[]>('/api-keys'),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: CreateApiKeyInput) =>
      api<ApiKeyCreateResponse>('/api-keys', {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api(`/api-keys/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
