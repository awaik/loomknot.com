'use client';

import { useState, use } from 'react';
import {
  FileText,
  Brain,
  Activity,
  Users,
  ArrowLeft,
  Lock,
  Globe,
  FolderKanban,
  Send,
  Check,
  Mail,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatRelative } from '@/lib/utils';
import { useProject } from '@/hooks/use-projects';
import { useProjectPages } from '@/hooks/use-pages';
import { useMemories } from '@/hooks/use-memories';
import { useMembers, useInviteMember, useProjectInvites, useResendInvite } from '@/hooks/use-members';
import { useActivity } from '@/hooks/use-activity';
import { useAuthStore } from '@/lib/auth';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS, ROLE_PERMISSIONS } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Markdown } from '@/components/markdown';
import { ApiError } from '@/lib/api';

type Tab = 'pages' | 'memories' | 'activity' | 'members';

const tabs: { key: Tab; labelKey: 'tabPages' | 'tabMemories' | 'tabActivity' | 'tabMembers'; icon: typeof FileText }[] = [
  { key: 'pages', labelKey: 'tabPages', icon: FileText },
  { key: 'memories', labelKey: 'tabMemories', icon: Brain },
  { key: 'activity', labelKey: 'tabActivity', icon: Activity },
  { key: 'members', labelKey: 'tabMembers', icon: Users },
];

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const [activeTab, setActiveTab] = useState<Tab>('pages');
  const { data: project, isLoading } = useProject(id);

  useSocketRoom({
    room: ROOMS.project(id),
    events: [
      EVENTS.PAGE_CREATED,
      EVENTS.PAGE_UPDATED,
      EVENTS.MEMORY_CREATED,
      EVENTS.MEMORY_UPDATED,
      EVENTS.MEMBER_JOINED,
      EVENTS.PROJECT_UPDATED,
    ],
    queryKeys: [
      ['project', id],
      ['pages', id],
      ['memories', id],
      ['members', id],
      ['activity', id],
    ],
  });

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

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-thread text-thread'
                  : 'border-transparent text-content-secondary hover:text-content hover:border-border-strong',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'pages' && <PagesTab projectId={id} />}
      {activeTab === 'memories' && <MemoriesTab projectId={id} />}
      {activeTab === 'activity' && <ActivityTab projectId={id} />}
      {activeTab === 'members' && <MembersTab projectId={id} />}
    </>
  );
}

function PagesTab({ projectId }: { projectId: string }) {
  const t = useTranslations('Project');
  const { data: pages, isLoading } = useProjectPages(projectId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noPagesTitle')}
        description={t('noPagesDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      {pages.map((page) => (
        <Link
          key={page.id}
          href={`/app/projects/${projectId}/pages/${page.id}`}
          className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-alt"
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
      ))}
    </div>
  );
}

function MemoriesTab({ projectId }: { projectId: string }) {
  const t = useTranslations('Project');
  const { data, isLoading } = useMemories(projectId);
  const memories = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!memories || memories.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title={t('noMemoriesTitle')}
        description={t('noMemoriesDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="rounded-md border border-border bg-surface-elevated px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {memory.level === 'private' ? (
                <Lock className="h-4 w-4 text-content-tertiary" />
              ) : memory.level === 'public' ? (
                <Globe className="h-4 w-4 text-sage" />
              ) : (
                <Users className="h-4 w-4 text-info" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-content">
                  {memory.key}
                </span>
                <span className="rounded-pill bg-surface-alt px-1.5 py-0.5 text-xs text-content-tertiary">
                  {memory.category}
                </span>
              </div>
              {memory.summary ? (
                <Markdown className="mt-1">{memory.summary}</Markdown>
              ) : (
                <pre className="mt-1 overflow-x-auto text-xs text-content-secondary font-mono whitespace-pre-wrap">
                  {JSON.stringify(memory.value, null, 2)}
                </pre>
              )}
            </div>
            <span className="shrink-0 text-xs text-content-tertiary">
              {memory.source}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const ACTION_ICONS: Record<string, typeof FileText> = {
  page: FileText,
  memory: Brain,
  negotiation: Users,
  project: FolderKanban,
  member: Users,
  apikey: Lock,
  task: Activity,
};

function getActionIcon(action: string) {
  const prefix = action.split('.')[0];
  return ACTION_ICONS[prefix] ?? Activity;
}

function formatAction(action: string, metadata: Record<string, unknown> | null, t: ReturnType<typeof useTranslations<'Project'>>) {
  const key = `action_${action.replace('.', '_')}` as Parameters<typeof t>[0];
  const translated = t.has(key) ? t(key) : action;
  const title = metadata?.title ?? metadata?.key ?? metadata?.slug;
  if (title) return `${translated}: ${String(title)}`;
  return translated;
}

function ActivityTab({ projectId }: { projectId: string }) {
  const t = useTranslations('Project');
  const [since] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  const { data, isLoading } = useActivity(projectId, { limit: 50, since });
  const entries = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title={t('activityTitle')}
        description={t('activityDesc')}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const Icon = getActionIcon(entry.action);
        const isAgent = !!entry.apiKeyId && !entry.userId;
        const actor = entry.userName ?? entry.userEmail ?? (isAgent ? 'Agent' : 'System');

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md px-4 py-2.5 transition-colors hover:bg-surface-alt"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-surface-alt">
              <Icon className="h-3.5 w-3.5 text-content-tertiary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-content">
                <span className="font-medium">{actor}</span>
                {' '}
                <span className="text-content-secondary">
                  {formatAction(entry.action, entry.metadata, t)}
                </span>
              </p>
            </div>
            <span className="shrink-0 text-xs text-content-tertiary whitespace-nowrap">
              {formatRelative(entry.createdAt, t)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MembersTab({ projectId }: { projectId: string }) {
  const t = useTranslations('Project');
  const { data: members, isLoading } = useMembers(projectId);
  const currentUser = useAuthStore((s) => s.user);

  // Determine if current user can manage members
  const myMembership = members?.find((m) => m.userId === currentUser?.id);
  const canManageMembers =
    myMembership?.role
      ? ROLE_PERMISSIONS[myMembership.role as keyof typeof ROLE_PERMISSIONS]?.canManageMembers ?? false
      : false;

  const { data: pendingInvites } = useProjectInvites(projectId, canManageMembers);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManageMembers && <InviteForm projectId={projectId} />}

      {!members || members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('noMembersTitle')}
          description={t('noMembersDesc')}
        />
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-thread/10 text-sm font-medium text-thread">
                {member.user.name?.[0]?.toUpperCase() ??
                  member.user.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content truncate">
                  {member.user.name ?? member.user.email}
                </p>
                {member.user.name && (
                  <p className="text-xs text-content-tertiary truncate">
                    {member.user.email}
                  </p>
                )}
              </div>
              <span className="rounded-pill bg-surface-alt px-2 py-0.5 text-xs font-medium text-content-secondary">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {canManageMembers && pendingInvites && pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
            {t('pendingInvites')}
          </h3>
          {pendingInvites.map((invite) => (
            <PendingInviteRow key={invite.id} invite={invite} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingInviteRow({ invite, projectId }: { invite: import('@/hooks/use-members').PendingInvite; projectId: string }) {
  const t = useTranslations('Project');
  const resendInvite = useResendInvite(projectId);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleResend = async () => {
    setFeedback(null);
    try {
      await resendInvite.mutateAsync(invite.id);
      setFeedback({ type: 'success', message: t('resendSuccess', { email: invite.email }) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const data = err.data as { error?: string } | undefined;
        setFeedback({
          type: 'error',
          message: data?.error === 'RESEND_COOLDOWN' ? t('resendCooldown') : t('resendError'),
        });
      } else {
        setFeedback({ type: 'error', message: t('resendError') });
      }
    }
  };

  return (
    <div className="rounded-md border border-border border-dashed bg-surface-elevated px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-alt text-sm">
          <Mail className="h-4 w-4 text-content-tertiary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-content truncate">{invite.email}</p>
          <p className="text-xs text-content-tertiary">
            {t('pendingInviteSent', { time: formatRelative(invite.lastSentAt, t) })}
          </p>
        </div>
        <span className="rounded-pill bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
          {t('pendingLabel')}
        </span>
        <span className="rounded-pill bg-surface-alt px-2 py-0.5 text-xs font-medium text-content-secondary">
          {invite.role}
        </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendInvite.isPending}
          className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-thread transition-colors cursor-pointer hover:bg-thread/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn('h-3 w-3', resendInvite.isPending && 'animate-spin')} />
          {t('resendInvite')}
        </button>
      </div>
      {feedback && (
        <div className={cn(
          'mt-2 flex items-center gap-2 text-xs',
          feedback.type === 'success' ? 'text-sage' : 'text-accent',
        )}>
          {feedback.type === 'success' && <Check className="h-3 w-3" />}
          {feedback.type === 'error' && <Clock className="h-3 w-3" />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}

function InviteForm({ projectId }: { projectId: string }) {
  const t = useTranslations('Project');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inviteMember = useInviteMember(projectId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setFeedback(null);

    try {
      await inviteMember.mutateAsync({ email: trimmedEmail, role });
      setFeedback({ type: 'success', message: t('inviteSuccess', { email: trimmedEmail }) });
      setEmail('');
      setRole('member');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = ((err.data as { message?: string })?.message ?? '').toLowerCase();
        const errorMessage = msg.includes('already a member')
          ? t('inviteErrorAlreadyMember')
          : t('inviteErrorPending');
        setFeedback({ type: 'error', message: errorMessage });
      } else {
        setFeedback({ type: 'error', message: t('inviteError') });
      }
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFeedback(null);
            }}
            placeholder={t('invitePlaceholder')}
            className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content transition-colors focus:border-border-focus focus:outline-none"
        >
          <option value="editor">{t('roleEditor')}</option>
          <option value="member">{t('roleMember')}</option>
          <option value="viewer">{t('roleViewer')}</option>
        </select>
        <button
          type="submit"
          disabled={!email.trim() || inviteMember.isPending}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors',
            'hover:bg-thread-dark',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Send className="h-3.5 w-3.5" />
          {inviteMember.isPending ? t('inviteSending') : t('inviteSend')}
        </button>
      </form>
      {feedback && (
        <div className={cn(
          'mt-3 flex items-center gap-2 text-sm',
          feedback.type === 'success' ? 'text-sage' : 'text-accent',
        )}>
          {feedback.type === 'success' && <Check className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}
