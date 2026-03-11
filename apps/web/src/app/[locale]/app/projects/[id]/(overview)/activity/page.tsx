'use client';

import { use, useState } from 'react';
import {
  FileText,
  Brain,
  Activity,
  Users,
  FolderKanban,
  Lock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatRelative } from '@/lib/utils';
import { useActivity } from '@/hooks/use-activity';
import { EmptyState } from '@/components/empty-state';

const ACTION_ICONS: Record<string, typeof FileText> = {
  page: FileText,
  memory: Brain,
  negotiation: Users,
  project: FolderKanban,
  member: Users,
  apikey: Lock,
  task: Activity,
};

function getActionIcon(action: string) {
  const prefix = action.split('.')[0];
  return ACTION_ICONS[prefix] ?? Activity;
}

function formatAction(
  action: string,
  metadata: Record<string, unknown> | null,
  t: ReturnType<typeof useTranslations<'Project'>>,
) {
  const key = `action_${action.replace('.', '_')}` as Parameters<typeof t>[0];
  const translated = t.has(key) ? t(key) : action;
  const title = metadata?.title ?? metadata?.key ?? metadata?.slug;
  if (title) return `${translated}: ${String(title)}`;
  return translated;
}

export default function ProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const [since] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const { data, isLoading } = useActivity(id, { limit: 50, since });
  const entries = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title={t('activityTitle')}
        description={t('activityDesc')}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const Icon = getActionIcon(entry.action);
        const isAgent = !!entry.apiKeyId && !entry.userId;
        const actor =
          entry.userName ??
          entry.userEmail ??
          (isAgent ? 'Agent' : 'System');

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md px-4 py-2.5 transition-colors hover:bg-surface-alt"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-surface-alt">
              <Icon className="h-3.5 w-3.5 text-content-tertiary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-content">
                <span className="font-medium">{actor}</span>{' '}
                <span className="text-content-secondary">
                  {formatAction(entry.action, entry.metadata, t)}
                </span>
              </p>
            </div>
            <span className="shrink-0 text-xs text-content-tertiary whitespace-nowrap">
              {formatRelative(entry.createdAt, t)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
