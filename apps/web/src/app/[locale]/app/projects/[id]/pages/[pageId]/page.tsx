'use client';

import { use } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useProjectPage, type PageBlock } from '@/hooks/use-pages';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';

export default function PageViewerPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = use(params);
  const { data: page, isLoading } = useProjectPage(id, pageId);

  useSocketRoom({
    room: ROOMS.page(pageId),
    events: [EVENTS.PAGE_UPDATED],
    queryKeys: [['page', pageId]],
  });

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
        title="Page not found"
        description="This page may have been deleted or you don't have access."
        action={
          <Link
            href={`/app/projects/${id}`}
            className="flex items-center gap-1.5 text-sm text-thread transition-colors hover:text-thread-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
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
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={page.status} />
            <Link
              href={`/app/projects/${id}`}
              className="flex items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        }
      />

      {/* Blocks */}
      {page.blocks && page.blocks.length > 0 ? (
        <div className="space-y-4">
          {page.blocks
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No content blocks"
          description="This page doesn't have any content blocks yet."
          className="py-8"
        />
      )}
    </>
  );
}

function BlockRenderer({ block }: { block: PageBlock }) {
  if (block.type === 'text') {
    const text =
      typeof block.content.text === 'string'
        ? block.content.text
        : JSON.stringify(block.content);

    return (
      <div className="rounded-md border border-border bg-surface-elevated p-4">
        <p className="whitespace-pre-wrap text-sm text-content">{text}</p>
      </div>
    );
  }

  // Fallback: render block type and JSON content
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-pill bg-surface-alt px-2 py-0.5 text-xs font-medium text-content-secondary">
          {block.type}
        </span>
      </div>
      <pre className="overflow-x-auto rounded-sm bg-surface-sunken p-3 text-xs text-content-secondary font-mono">
        {JSON.stringify(block.content, null, 2)}
      </pre>
    </div>
  );
}
