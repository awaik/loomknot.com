'use client';

import { use, useMemo } from 'react';
import { ArrowRight, FileText, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BlockRenderer } from '@/components/blocks';
import { EmptyState } from '@/components/empty-state';
import { Markdown } from '@/components/markdown';
import { StatusBadge } from '@/components/status-badge';
import { useProjectPages, useProjectPage } from '@/hooks/use-pages';
import { useProject } from '@/hooks/use-projects';
import { INDEX_PAGE_SLUG } from '@loomknot/shared';

export default function ProjectMainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const { data: project } = useProject(id);
  const { data: pages, isLoading: isPagesLoading } = useProjectPages(id);

  const mainPageMeta = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    return (
      pages.find((page) => page.slug === INDEX_PAGE_SLUG) ??
      pages[0] ??
      null
    );
  }, [pages]);

  const { data: mainPage, isLoading: isMainPageLoading } = useProjectPage(
    id,
    mainPageMeta?.id,
  );

  const relatedPages = useMemo(
    () => pages?.filter((page) => page.id !== mainPageMeta?.id) ?? [],
    [mainPageMeta?.id, pages],
  );

  const sortedBlocks = useMemo(
    () =>
      mainPage?.blocks
        ? [...mainPage.blocks]
            .filter(
              (block) =>
                block.type !== 'heading' ||
                block.content.level !== 1 ||
                block.content.text !== project?.title,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [mainPage?.blocks, project?.title],
  );

  if (isPagesLoading || isMainPageLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="h-12 rounded-md bg-surface-alt animate-pulse" />
          <div className="h-32 rounded-md bg-surface-alt animate-pulse" />
          <div className="h-24 rounded-md bg-surface-alt animate-pulse" />
        </div>
        <div className="h-52 rounded-md bg-surface-alt animate-pulse" />
      </div>
    );
  }

  if ((!pages || pages.length === 0) && !project?.summary && !project?.description) {
    return (
      <EmptyState
        icon={Home}
        title={t('mainEmptyTitle')}
        description={t('mainEmptyDesc')}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-thread/10 px-2.5 py-1 text-xs font-medium text-thread">
            <Home className="h-3.5 w-3.5" />
            {t('mainBadge')}
          </span>
          {mainPage && <StatusBadge status={mainPage.status} />}
        </div>

        {mainPage?.description && (
          <div>
            <Markdown className="prose-p:text-content-secondary">
              {mainPage.description}
            </Markdown>
          </div>
        )}

        {sortedBlocks.length > 0 ? (
          <div className="space-y-5">
            {sortedBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-surface-elevated p-5">
            <h3 className="text-sm font-medium text-content">
              {project?.title ?? t('mainSnapshotTitle')}
            </h3>
            {(project?.summary || project?.description) && (
              <Markdown className="mt-2 prose-p:text-content-secondary">
                {project.summary ?? project.description ?? ''}
              </Markdown>
            )}
          </div>
        )}
      </main>

      <aside className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-content">{t('relatedPagesTitle')}</h2>
          <p className="mt-1 text-xs text-content-tertiary">{t('relatedPagesDesc')}</p>
        </div>

        {relatedPages.length > 0 ? (
          <div className="space-y-2">
            {relatedPages.map((page) => (
              <Link
                key={page.id}
                href={`/app/projects/${id}/pages/${page.id}`}
                className="group flex items-start gap-3 rounded-md border border-border bg-surface-elevated px-3 py-3 transition-colors hover:bg-surface-alt"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-content">
                    {page.title}
                  </span>
                  {page.description && (
                    <span className="mt-0.5 block truncate text-xs text-content-tertiary">
                      {page.description}
                    </span>
                  )}
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-border bg-surface-elevated px-3 py-3 text-sm text-content-secondary">
            {t('relatedPagesEmpty')}
          </p>
        )}
      </aside>
    </div>
  );
}
