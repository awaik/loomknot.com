'use client';

import { use, useState } from 'react';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useProjectPages } from '@/hooks/use-pages';
import type { PageResponse } from '@/hooks/use-pages';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth';
import { INDEX_PAGE_SLUG, ROLE_PERMISSIONS } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { EditPageDialog } from '@/components/edit-page-dialog';
import { DeletePageDialog } from '@/components/delete-page-dialog';

export default function ProjectPagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const { data: pages, isLoading } = useProjectPages(id);
  const { data: members } = useMembers(id);
  const currentUser = useAuthStore((s) => s.user);

  const myRole = members?.find((m) => m.userId === currentUser?.id)?.role;
  const canEdit =
    myRole
      ? ROLE_PERMISSIONS[myRole as keyof typeof ROLE_PERMISSIONS]?.canEditMemory ?? false
      : false;
  const isOwner = myRole === 'owner';

  const [editingPage, setEditingPage] = useState<PageResponse | null>(null);
  const [deletingPage, setDeletingPage] = useState<PageResponse | null>(null);
  const childPages = pages?.filter((page) => page.slug !== INDEX_PAGE_SLUG);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!childPages || childPages.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noPagesTitle')}
        description={t('noPagesDesc')}
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {childPages.map((page) => (
          <div
            key={page.id}
            className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-alt"
          >
            <Link
              href={`/app/projects/${id}/pages/${page.id}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <FileText className="h-4 w-4 shrink-0 text-content-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content truncate">
                  {page.title}
                </p>
                {page.description && (
                  <p className="text-xs text-content-tertiary truncate mt-0.5">
                    {page.description}
                  </p>
                )}
              </div>
              <StatusBadge status={page.status} />
            </Link>

            {(canEdit || isOwner) && (
              <div className="flex items-center gap-1 shrink-0">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingPage(page)}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-content-tertiary transition-colors hover:bg-surface-alt hover:text-content"
                    title={t('editPage')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setDeletingPage(page)}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-content-tertiary transition-colors hover:bg-accent/10 hover:text-accent"
                    title={t('deletePage')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editingPage && (
        <EditPageDialog
          open={!!editingPage}
          onClose={() => setEditingPage(null)}
          page={editingPage}
          projectId={id}
        />
      )}

      {deletingPage && (
        <DeletePageDialog
          open={!!deletingPage}
          onClose={() => setDeletingPage(null)}
          pageId={deletingPage.id}
          pageTitle={deletingPage.title}
          projectId={id}
        />
      )}
    </>
  );
}
