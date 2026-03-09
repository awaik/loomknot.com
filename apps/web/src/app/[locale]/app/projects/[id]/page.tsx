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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/hooks/use-projects';
import { useProjectPages } from '@/hooks/use-pages';
import { useMemories } from '@/hooks/use-memories';
import { useMembers } from '@/hooks/use-members';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';

type Tab = 'pages' | 'memories' | 'activity' | 'members';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'memories', label: 'Memories', icon: Brain },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'members', label: 'Members', icon: Users },
];

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
        title="Project not found"
        description="This project may have been deleted or you don't have access."
        action={
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-thread transition-colors hover:text-thread-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
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
              {tab.label}
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
        title="No pages yet"
        description="Pages will be created as your project evolves with memories and agent contributions."
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
        title="No memories yet"
        description="Memories store preferences, decisions, and context for your project. They can be added by you or your agents."
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
              <p className="mt-1 text-sm text-content-secondary">
                {memory.summary ?? JSON.stringify(memory.value)}
              </p>
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

function ActivityTab({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      icon={Activity}
      title="Activity feed"
      description="Recent activity for this project will appear here."
      className="py-8"
    />
  );
}

function MembersTab({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = useMembers(projectId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-md bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members"
        description="Invite people to collaborate on this project."
      />
    );
  }

  return (
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
  );
}
