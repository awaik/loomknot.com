'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useUpdatePage } from '@/hooks/use-pages';
import type { PageResponse } from '@/hooks/use-pages';

interface EditPageDialogProps {
  open: boolean;
  onClose: () => void;
  page: PageResponse;
  projectId: string;
}

export function EditPageDialog({
  open,
  onClose,
  page,
  projectId,
}: EditPageDialogProps) {
  const t = useTranslations('Project');
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const updatePage = useUpdatePage(projectId);

  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setDescription(page.description ?? '');
      setError(null);
    }
  }, [open, page.title, page.description]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);

    try {
      await updatePage.mutateAsync({
        pageId: page.id,
        input: {
          title: title.trim(),
          description: description.trim() || undefined,
        },
      });
      onClose();
    } catch {
      setError(t('editPageError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-md bg-surface-elevated border border-border p-6 shadow-float animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-content">
            {t('editPageTitle')}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="page-title"
              className="block text-sm font-medium text-content mb-1.5"
            >
              {t('editPageTitleLabel')}
            </label>
            <input
              id="page-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="page-description"
              className="block text-sm font-medium text-content mb-1.5"
            >
              {t('editPageDescLabel')}
            </label>
            <textarea
              id="page-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-accent">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-alt"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || updatePage.isPending}
              className={cn(
                'rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors',
                'hover:bg-thread-dark',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {updatePage.isPending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
