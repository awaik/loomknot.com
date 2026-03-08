'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore, logout } from '@/lib/auth';
import { useRouter } from '@/i18n/navigation';

export default function AppPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const t = useTranslations('App');

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-content-secondary">{t('loading')}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold">
          Loom<span className="text-thread">knot</span>
        </h1>
        <p className="text-content-secondary">
          {t.rich('welcome', {
            strong: (chunks) => <strong className="text-content">{chunks}</strong>,
            email: user?.email ?? '',
          })}
        </p>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm text-content-secondary transition-colors hover:bg-muted"
        >
          {t('logout')}
        </button>
      </div>
    </main>
  );
}
