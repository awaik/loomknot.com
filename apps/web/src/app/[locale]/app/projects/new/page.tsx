'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateProject } from '@/hooks/use-projects';
import { Link, useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { VERTICALS } from '@loomknot/shared';

const verticalOptions = Object.entries(VERTICALS).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

export default function NewProjectPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vertical, setVertical] = useState<string>(VERTICALS.travel);
  const router = useRouter();
  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const project = await createProject.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      vertical,
    });

    router.push(`/app/projects/${project.id}`);
  };

  return (
    <>
      <PageHeader
        title="Create Project"
        actions={
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-content mb-1.5"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Barcelona Trip 2026"
              required
              autoFocus
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-content mb-1.5"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A trip to Barcelona with friends..."
              rows={4}
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="vertical"
              className="block text-sm font-medium text-content mb-1.5"
            >
              Category
            </label>
            <select
              id="vertical"
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!title.trim() || createProject.isPending}
              className={cn(
                'rounded-sm bg-thread px-6 py-2 text-sm font-medium text-white transition-colors',
                'hover:bg-thread-dark',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
            <Link
              href="/app"
              className="rounded-sm px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-alt"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
