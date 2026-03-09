'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderKanban, Plus, ListTodo, Users, Brain, Clock } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { CreateProjectDialog } from '@/components/create-project-dialog';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const tApp = useTranslations('App');
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ limit: 5 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const tasks = tasksData?.data;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
          >
            <Plus className="h-4 w-4" />
            {tApp('newProject')}
          </button>
        }
      />

      {/* Projects */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-content mb-4">
          {tApp('projects')}
        </h2>

        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-md border border-border bg-surface-elevated animate-pulse"
              />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={t('noProjectsTitle')}
            description={t('noProjectsDesc')}
            action={
              <button
                onClick={() => setDialogOpen(true)}
                className="flex items-center gap-2 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
              >
                <Plus className="h-4 w-4" />
                {t('createProject')}
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                className="group rounded-md border border-border bg-surface-elevated p-4 shadow-sm transition-all duration-fast hover:border-thread/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold text-content group-hover:text-thread transition-colors">
                    {project.title}
                  </h3>
                  <span className="shrink-0 rounded-pill bg-surface-alt px-2 py-0.5 text-xs text-content-tertiary">
                    {project.vertical}
                  </span>
                </div>

                {project.description && (
                  <p className="mt-2 text-sm text-content-secondary line-clamp-2">
                    {project.description}
                  </p>
                )}

                {project.summary && !project.description && (
                  <p className="mt-2 text-sm text-content-secondary line-clamp-2">
                    {project.summary}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-content-tertiary">
                  {project._counts && (
                    <>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project._counts.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3.5 w-3.5" />
                        {project._counts.memories}
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelative(project.updatedAt, t)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent tasks */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold text-content">
            {t('recentTasks')}
          </h2>
          <Link
            href="/app/tasks"
            className="text-sm text-thread transition-colors hover:text-thread-dark"
          >
            {t('viewAll')}
          </Link>
        </div>

        {tasksLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-md border border-border bg-surface-elevated animate-pulse"
              />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={t('noTasksTitle')}
            description={t('noTasksDesc')}
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href="/app/tasks"
                className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-alt"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-content truncate">
                    {task.title}
                  </p>
                </div>
                <StatusBadge status={task.status} />
                <span className="shrink-0 text-xs text-content-tertiary">
                  {formatRelative(task.createdAt, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

