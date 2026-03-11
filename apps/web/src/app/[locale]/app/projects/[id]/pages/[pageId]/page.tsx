'use client';

import { use, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, FileText } from 'lucide-react';
import { useProjectPage } from '@/hooks/use-pages';
import { useProject } from '@/hooks/use-projects';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { BlockRenderer } from '@/components/blocks';

export default function PageViewerPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const t = useTranslations('PageViewer');
  const { id, pageId } = use(params);
  const { data: page, isLoading } = useProjectPage(id, pageId);
  const { data: project } = useProject(id);

  useSocketRoom({
    room: ROOMS.page(pageId),
    events: [EVENTS.PAGE_UPDATED],
    queryKeys: [['page', pageId]],
  });

  const sortedBlocks = useMemo(
    () => (page?.blocks ? [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [page?.blocks],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-surface-alt" />
        <div className="h-4 w-96 rounded bg-surface-alt" />
        <div className="mt-6 h-96 rounded-md bg-surface-alt" />
      </div>
    );
  }

  if (!page) {
    return (
      <EmptyState
        icon={FileText}
        title={t('notFound')}
        description={t('notFoundDesc')}
        action={
          <Link
            href={`/app/projects/${id}`}
            className="flex items-center gap-1.5 text-sm text-thread transition-colors hover:text-thread-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToProject')}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={page.title}
        description={page.description ?? undefined}
        breadcrumbs={[
          { label: t('breadcrumbProjects'), href: '/app' },
          { label: project?.title ?? '...', href: `/app/projects/${id}` },
          { label: page.title },
        ]}
        actions={<StatusBadge status={page.status} />}
      />

      {/* Blocks */}
      {sortedBlocks.length > 0 ? (
        <div className="space-y-4">
          {sortedBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={t('noBlocksTitle')}
          description={t('noBlocksDesc')}
          className="py-8"
        />
      )}
    </>
  );
}
