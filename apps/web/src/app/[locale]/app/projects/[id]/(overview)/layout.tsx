'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { FolderKanban, ArrowLeft } from 'lucide-react';
import { useProject } from '@/hooks/use-projects';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ProjectSubNav } from '@/components/project-sub-nav';

export default function ProjectOverviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const { data: project, isLoading } = useProject(id);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-surface-alt" />
        <div className="h-4 w-96 rounded bg-surface-alt" />
        <div className="mt-6 h-10 w-full rounded bg-surface-alt" />
        <div className="h-64 rounded-md bg-surface-alt" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={t('notFound')}
        description={t('notFoundDesc')}
        action={
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-thread transition-colors hover:text-thread-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToDashboard')}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={project.title}
        description={project.description ?? project.summary ?? undefined}
        breadcrumbs={[
          { label: t('breadcrumbProjects'), href: '/app' },
          { label: project.title },
        ]}
      />

      <ProjectSubNav projectId={id} />

      {children}
    </>
  );
}
