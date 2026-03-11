'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useDeletePage } from '@/hooks/use-pages';

interface DeletePageDialogProps {
  open: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
  projectId: string;
  onDeleted?: () => void;
}

export function DeletePageDialog({
  open,
  onClose,
  pageId,
  pageTitle,
  projectId,
  onDeleted,
}: DeletePageDialogProps) {
  const t = useTranslations('Project');
  const deletePage = useDeletePage(projectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleDelete = async () => {
    setError(null);
    try {
      await deletePage.mutateAsync(pageId);
      onClose();
      onDeleted?.();
    } catch {
      setError(t('deletePageError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-md bg-surface-elevated border border-border p-6 shadow-float animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-content">
            {t('deletePageTitle')}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-md bg-accent/5 border border-accent/20 px-3 py-3 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
          <p className="text-sm text-content-secondary">
            {t('deletePageDesc', { title: pageTitle })}
          </p>
        </div>

        {error && (
          <p className="text-sm text-accent mb-4">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-alt"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePage.isPending}
            className={cn(
              'rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-accent/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {deletePage.isPending ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
