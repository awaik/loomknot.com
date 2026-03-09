'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ListTodo,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import { useTasks, useCreateTask, type TaskResponse } from '@/hooks/use-tasks';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS } from '@loomknot/shared';
import { useAuthStore } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'done' | 'failed';

const statusFilters: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'pending', labelKey: 'filterPending' },
  { key: 'in_progress', labelKey: 'filterInProgress' },
  { key: 'done', labelKey: 'filterDone' },
  { key: 'failed', labelKey: 'filterFailed' },
];

export default function TasksPage() {
  const t = useTranslations('Tasks');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuthStore();

  const { data, isLoading } = useTasks(
    statusFilter === 'all' ? undefined : { status: statusFilter },
  );
  const tasks = data?.data;

  useSocketRoom({
    room: user ? `user:${user.id}` : undefined,
    events: [EVENTS.TASK_CREATED, EVENTS.TASK_UPDATED],
    queryKeys: [['tasks']],
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
          >
            <Plus className="h-4 w-4" />
            {t('newTask')}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {statusFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={cn(
              'shrink-0 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === filter.key
                ? 'bg-thread/10 text-thread'
                : 'text-content-secondary hover:bg-surface-alt hover:text-content',
            )}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </div>

      {/* Create task form */}
      {showCreateForm && (
        <CreateTaskForm onClose={() => setShowCreateForm(false)} />
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-md bg-surface-alt animate-pulse"
            />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t('noTasksTitle')}
          description={
            statusFilter === 'all'
              ? t('noTasksAllDesc')
              : t('noTasksFilterDesc', { status: t(statusFilters.find((f) => f.key === statusFilter)!.labelKey) })
          }
          action={
            statusFilter !== 'all' ? (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-sm text-thread transition-colors hover:text-thread-dark"
              >
                {t('showAll')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              onToggle={() =>
                setExpandedTask(expandedTask === task.id ? null : task.id)
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function TaskItem({
  task,
  expanded,
  onToggle,
}: {
  task: TaskResponse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('Tasks');

  return (
    <div className="rounded-md border border-border bg-surface-elevated overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-content truncate">
            {task.title}
          </p>
          <p className="text-xs text-content-tertiary mt-0.5 truncate">
            {task.prompt}
          </p>
        </div>
        <StatusBadge status={task.status} />
        <span className="shrink-0 flex items-center gap-1 text-xs text-content-tertiary">
          <Clock className="h-3 w-3" />
          {formatRelative(task.createdAt, t)}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-content-tertiary" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-content-tertiary" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-surface-sunken">
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-content-secondary">
                {t('prompt')}
              </span>
              <p className="mt-1 text-sm text-content">{task.prompt}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-content-tertiary">
              <span>
                {t('priority')}{' '}
                <span className="text-content-secondary">{task.priority}</span>
              </span>
              {task.scheduledAt && (
                <span>
                  {t('scheduled')}{' '}
                  <span className="text-content-secondary">
                    {new Date(task.scheduledAt).toLocaleString()}
                  </span>
                </span>
              )}
              {task.completedAt && (
                <span>
                  {t('completed')}{' '}
                  <span className="text-content-secondary">
                    {new Date(task.completedAt).toLocaleString()}
                  </span>
                </span>
              )}
            </div>

            {task.result != null && (
              <div>
                <span className="text-xs font-medium text-content-secondary">
                  {t('result')}
                </span>
                <pre className="mt-1 overflow-x-auto rounded-sm bg-surface p-2 text-xs text-content-secondary font-mono">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
            )}

            {task.logs && task.logs.length > 0 && (
              <div>
                <span className="text-xs font-medium text-content-secondary">
                  {t('logs')}
                </span>
                <div className="mt-1 space-y-1">
                  {task.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="shrink-0 text-content-tertiary font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 uppercase font-medium',
                          log.level === 'error'
                            ? 'text-error'
                            : log.level === 'warn'
                              ? 'text-warning'
                              : 'text-content-tertiary',
                        )}
                      >
                        {log.level}
                      </span>
                      <span className="text-content-secondary">
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations('Tasks');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [priority, setPriority] = useState<
    'low' | 'normal' | 'high' | 'urgent'
  >('normal');
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;

    await createTask.mutateAsync({
      title: title.trim(),
      prompt: prompt.trim(),
      priority,
    });

    setTitle('');
    setPrompt('');
    setPriority('normal');
    onClose();
  };

  return (
    <div className="mb-6 rounded-md border border-border bg-surface-elevated p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-base font-semibold text-content">
          {t('createTitle')}
        </h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('taskTitlePlaceholder')}
          required
          autoFocus
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
        />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('taskPromptPlaceholder')}
          required
          rows={3}
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none resize-none"
        />

        <div className="flex items-center gap-3">
          <select
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value as 'low' | 'normal' | 'high' | 'urgent',
              )
            }
            className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content transition-colors focus:border-border-focus focus:outline-none"
          >
            <option value="low">{t('priorityLow')}</option>
            <option value="normal">{t('priorityNormal')}</option>
            <option value="high">{t('priorityHigh')}</option>
            <option value="urgent">{t('priorityUrgent')}</option>
          </select>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-alt"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={
              !title.trim() || !prompt.trim() || createTask.isPending
            }
            className={cn(
              'rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-thread-dark',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {createTask.isPending ? t('creating') : t('create')}
          </button>
        </div>
      </form>
    </div>
  );
}
