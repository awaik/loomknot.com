'use client';

import { use, useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useProjectPage } from '@/hooks/use-pages';
import { useProject } from '@/hooks/use-projects';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS, ROLE_PERMISSIONS } from '@loomknot/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { BlockRenderer } from '@/components/blocks';
import { EditPageDialog } from '@/components/edit-page-dialog';
import { DeletePageDialog } from '@/components/delete-page-dialog';

export default function PageViewerPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const t = useTranslations('PageViewer');
  const { id, pageId } = use(params);
  const router = useRouter();
  const { data: page, isLoading } = useProjectPage(id, pageId);
  const { data: project } = useProject(id);
  const { data: members } = useMembers(id);
  const currentUser = useAuthStore((s) => s.user);

  const myRole = members?.find((m) => m.userId === currentUser?.id)?.role;
  const canEdit =
    myRole
      ? ROLE_PERMISSIONS[myRole as keyof typeof ROLE_PERMISSIONS]?.canEditMemory ?? false
      : false;
  const isOwner = myRole === 'owner';

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useSocketRoom({
    room: ROOMS.page(pageId),
    events: [EVENTS.PAGE_UPDATED],
    queryKeys: [['page', pageId]],
  });

  const sortedBlocks = useMemo(
    () =>
      page?.blocks
        ? [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
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
          { label: t('breadcrumbPages'), href: `/app/projects/${id}` },
          { label: page.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={page.status} />
            {canEdit && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-border bg-surface-elevated shadow-float z-10">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-content transition-colors hover:bg-surface-alt"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t('editPage')}
                      </button>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('deletePage')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

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

      {editOpen && (
        <EditPageDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          page={page}
          projectId={id}
        />
      )}

      {deleteOpen && (
        <DeletePageDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          pageId={page.id}
          pageTitle={page.title}
          projectId={id}
          onDeleted={() => router.push(`/app/projects/${id}`)}
        />
      )}
    </>
  );
}
