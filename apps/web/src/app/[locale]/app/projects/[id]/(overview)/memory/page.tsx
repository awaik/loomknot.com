'use client';

import { use } from 'react';
import { Brain, Lock, Globe, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemories } from '@/hooks/use-memories';
import { EmptyState } from '@/components/empty-state';
import { Markdown } from '@/components/markdown';

export default function ProjectMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const { data, isLoading } = useMemories(id);
  const memories = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!memories || memories.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title={t('noMemoriesTitle')}
        description={t('noMemoriesDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="rounded-md border border-border bg-surface-elevated px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {memory.level === 'private' ? (
                <Lock className="h-4 w-4 text-content-tertiary" />
              ) : memory.level === 'public' ? (
                <Globe className="h-4 w-4 text-sage" />
              ) : (
                <Users className="h-4 w-4 text-info" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-content">
                  {memory.key}
                </span>
                <span className="rounded-pill bg-surface-alt px-1.5 py-0.5 text-xs text-content-tertiary">
                  {memory.category}
                </span>
              </div>
              {memory.summary ? (
                <Markdown className="mt-1">{memory.summary}</Markdown>
              ) : (
                <pre className="mt-1 overflow-x-auto text-xs text-content-secondary font-mono whitespace-pre-wrap">
                  {JSON.stringify(memory.value, null, 2)}
                </pre>
              )}
            </div>
            <span className="shrink-0 text-xs text-content-tertiary">
              {memory.source}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
