'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import { Link, useRouter } from '@/i18n/navigation';

type Status = 'loading' | 'accepted' | 'expired' | 'email_mismatch' | 'already_member' | 'invalid' | 'auth_failed' | 'error';

interface AcceptResult {
  projectId: string;
  role: string;
}

function classifyError(err: unknown): Status {
  if (!(err instanceof ApiError)) return 'error';

  const msg = typeof (err.data as { message?: string })?.message === 'string'
    ? (err.data as { message: string }).message
    : '';

  if (err.status === 403) return 'email_mismatch';
  if (err.status === 400 && msg.toLowerCase().includes('expired')) return 'expired';
  if (err.status === 409) return 'already_member';
  if (err.status === 404) return 'invalid';
  return 'error';
}

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations('Invite');
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [projectId, setProjectId] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function accept() {
      const authed = await initAuth();

      if (!authed) {
        if (cancelled) return;
        setStatus('auth_failed');
        return;
      }

      try {
        const result = await api<AcceptResult>(`/invites/${token}/accept`, {
          method: 'POST',
        });
        if (cancelled) return;

        setProjectId(result.projectId);
        setStatus('accepted');

        redirectTimer.current = setTimeout(() => {
          router.replace(`/app/projects/${result.projectId}`);
        }, 2000);
      } catch (err) {
        if (cancelled) return;
        setStatus(classifyError(err));
      }
    }

    accept();

    return () => {
      cancelled = true;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          Loom<span className="text-thread">knot</span>
        </h1>
        <p className="text-sm text-content-secondary mb-8">{t('title')}</p>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-thread animate-spin" />
            <p className="text-sm text-content-secondary">{t('accepting')}</p>
          </div>
        )}

        {status === 'accepted' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
              <Check className="h-6 w-6 text-sage" />
            </div>
            <p className="text-sm font-medium text-content">{t('accepted')}</p>
            <p className="text-sm text-content-secondary">{t('acceptedDesc')}</p>
            {projectId && (
              <Link
                href={`/app/projects/${projectId}`}
                className="mt-2 cursor-pointer rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
              >
                {t('goToProject')}
              </Link>
            )}
          </div>
        )}

        {status === 'expired' && (
          <InviteError message={t('expired')} />
        )}

        {status === 'already_member' && (
          <InviteError message={t('alreadyMember')} />
        )}

        {status === 'email_mismatch' && (
          <InviteLoginPrompt message={t('emailMismatch')} href="/login" />
        )}

        {status === 'invalid' && (
          <InviteError message={t('invalid')} />
        )}

        {status === 'auth_failed' && (
          <InviteLoginPrompt message={t('authFailed')} href={`/login?redirect=/invites/${token}`} />
        )}

        {status === 'error' && (
          <InviteError message={t('error')} />
        )}

        {status !== 'loading' && status !== 'accepted' && (
          <Link
            href="/app"
            className="mt-6 inline-block text-sm text-content-secondary hover:text-content transition-colors"
          >
            {t('backToApp')}
          </Link>
        )}
      </div>
    </main>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <AlertCircle className="h-6 w-6 text-accent" />
      </div>
      <p className="text-sm text-content">{message}</p>
    </div>
  );
}

function InviteLoginPrompt({ message, href }: { message: string; href: string }) {
  const t = useTranslations('Invite');
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <AlertCircle className="h-6 w-6 text-accent" />
      </div>
      <p className="text-sm text-content">{message}</p>
      <Link
        href={href}
        className="mt-2 text-sm text-thread hover:text-thread-dark transition-colors"
      >
        {t('goToLogin')}
      </Link>
    </div>
  );
}
