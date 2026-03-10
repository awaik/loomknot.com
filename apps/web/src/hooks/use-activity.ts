import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import type { ActivityAction } from '@loomknot/shared';

export interface ActivityEntry {
  id: string;
  projectId: string;
  userId: string | null;
  apiKeyId: string | null;
  action: ActivityAction;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface ActivityFilters {
  since?: string;
  limit?: number;
}

export function useActivity(
  projectId: string | undefined,
  filters?: ActivityFilters,
) {
  const params = new URLSearchParams();
  if (filters?.since) params.set('since', filters.since);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();

  return useQuery<{ data: ActivityEntry[] }>({
    queryKey: ['activity', projectId, filters],
    queryFn: () =>
      projectApi<{ data: ActivityEntry[] }>(
        projectId!,
        `/projects/${projectId}/activity${qs ? `?${qs}` : ''}`,
      ),
    enabled: !!projectId,
  });
}
