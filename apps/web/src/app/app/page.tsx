'use client';

import { useAuthStore, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AppPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-content-secondary">Loading...</p>
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
          Welcome, <strong className="text-content">{user?.email}</strong>
        </p>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm text-content-secondary transition-colors hover:bg-muted"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
