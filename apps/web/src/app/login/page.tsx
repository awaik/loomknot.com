'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendMagicLink, verifyPin, useAuthStore } from '@/lib/auth';

type Step = 'email' | 'pin';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/app');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await sendMagicLink(email);
      setStep('pin');
      setTimeout(() => pinRef.current?.focus(), 100);
    } catch {
      setError('Failed to send code. Please check your email.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await verifyPin(email, pin);
      router.replace('/app');
    } catch {
      setError('Invalid or expired code.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            Loom<span className="text-thread">knot</span>
          </h1>
          <p className="mt-2 text-content-secondary text-sm">
            Pages as Memory
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-content"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-thread/50"
              />
            </div>

            {error && (
              <p className="text-sm text-accent">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-thread px-4 py-2.5 font-medium text-white transition-colors hover:bg-thread/90 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Get code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-content-secondary">
              Code sent to <strong className="text-content">{email}</strong>
            </p>

            <div>
              <label
                htmlFor="pin"
                className="mb-1 block text-sm font-medium text-content"
              >
                6-digit code
              </label>
              <input
                ref={pinRef}
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-center text-2xl font-mono tracking-[0.3em] text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-thread/50"
              />
            </div>

            {error && (
              <p className="text-sm text-accent">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || pin.length < 6}
              className="w-full rounded-lg bg-thread px-4 py-2.5 font-medium text-white transition-colors hover:bg-thread/90 disabled:opacity-50"
            >
              {submitting ? 'Verifying...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setPin('');
                setError('');
              }}
              className="w-full text-sm text-content-secondary hover:text-content"
            >
              Use different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
