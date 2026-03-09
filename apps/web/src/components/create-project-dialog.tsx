'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateProject } from '@/hooks/use-projects';
import { useRouter } from '@/i18n/navigation';
import { VERTICALS } from '@loomknot/shared';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

const verticalOptions = Object.entries(VERTICALS).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

export function CreateProjectDialog({
  open,
  onClose,
}: CreateProjectDialogProps) {
  const t = useTranslations('CreateProject');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vertical, setVertical] = useState<string>(VERTICALS.travel);
  const router = useRouter();
  const createProject = useCreateProject();

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const project = await createProject.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      vertical,
    });

    setTitle('');
    setDescription('');
    setVertical(VERTICALS.travel);
    onClose();
    router.push(`/app/projects/${project.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-md bg-surface-elevated border border-border p-6 shadow-float animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold text-content">
            {t('dialogTitle')}
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
              htmlFor="project-title"
              className="block text-sm font-medium text-content mb-1.5"
            >
              {t('titleLabel')}
            </label>
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              required
              autoFocus
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-content mb-1.5"
            >
              {t('descriptionLabel')}
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="project-vertical"
              className="block text-sm font-medium text-content mb-1.5"
            >
              {t('categoryLabel')}
            </label>
            <select
              id="project-vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content transition-colors focus:border-border-focus focus:outline-none"
            >
              {verticalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
              disabled={!title.trim() || createProject.isPending}
              className={cn(
                'rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors',
                'hover:bg-thread-dark',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {createProject.isPending ? t('creating') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
