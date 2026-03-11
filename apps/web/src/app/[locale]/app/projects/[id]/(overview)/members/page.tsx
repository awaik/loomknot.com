'use client';

import { use, useState } from 'react';
import {
  Users,
  Send,
  Check,
  Mail,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatRelative } from '@/lib/utils';
import {
  useMembers,
  useInviteMember,
  useProjectInvites,
  useResendInvite,
} from '@/hooks/use-members';
import type { PendingInvite } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth';
import { ROLE_PERMISSIONS } from '@loomknot/shared';
import { EmptyState } from '@/components/empty-state';
import { ApiError } from '@/lib/api';

export default function ProjectMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('Project');
  const { data: members, isLoading } = useMembers(id);
  const currentUser = useAuthStore((s) => s.user);

  const myMembership = members?.find((m) => m.userId === currentUser?.id);
  const canManageMembers =
    myMembership?.role
      ? ROLE_PERMISSIONS[myMembership.role as keyof typeof ROLE_PERMISSIONS]
          ?.canManageMembers ?? false
      : false;

  const { data: pendingInvites } = useProjectInvites(id, canManageMembers);

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
      {canManageMembers && <InviteForm projectId={id} />}

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
            <PendingInviteRow
              key={invite.id}
              invite={invite}
              projectId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingInviteRow({
  invite,
  projectId,
}: {
  invite: PendingInvite;
  projectId: string;
}) {
  const t = useTranslations('Project');
  const resendInvite = useResendInvite(projectId);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleResend = async () => {
    setFeedback(null);
    try {
      await resendInvite.mutateAsync(invite.id);
      setFeedback({
        type: 'success',
        message: t('resendSuccess', { email: invite.email }),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const data = err.data as { error?: string } | undefined;
        setFeedback({
          type: 'error',
          message:
            data?.error === 'RESEND_COOLDOWN'
              ? t('resendCooldown')
              : t('resendError'),
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
            {t('pendingInviteSent', {
              time: formatRelative(invite.lastSentAt, t),
            })}
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
          <RefreshCw
            className={cn(
              'h-3 w-3',
              resendInvite.isPending && 'animate-spin',
            )}
          />
          {t('resendInvite')}
        </button>
      </div>
      {feedback && (
        <div
          className={cn(
            'mt-2 flex items-center gap-2 text-xs',
            feedback.type === 'success' ? 'text-sage' : 'text-accent',
          )}
        >
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
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const inviteMember = useInviteMember(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setFeedback(null);

    try {
      await inviteMember.mutateAsync({ email: trimmedEmail, role });
      setFeedback({
        type: 'success',
        message: t('inviteSuccess', { email: trimmedEmail }),
      });
      setEmail('');
      setRole('member');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = (
          (err.data as { message?: string })?.message ?? ''
        ).toLowerCase();
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
        <div
          className={cn(
            'mt-3 flex items-center gap-2 text-sm',
            feedback.type === 'success' ? 'text-sage' : 'text-accent',
          )}
        >
          {feedback.type === 'success' && <Check className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}
