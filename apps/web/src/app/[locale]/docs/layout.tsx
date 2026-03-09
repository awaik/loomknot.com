import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'Documentation — LoomKnot',
  description:
    'Connect Claude, ChatGPT, Gemini, Cursor, and other AI agents to your LoomKnot projects via MCP.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-semibold text-content transition-colors hover:text-thread"
            >
              Loom<span className="text-thread">knot</span>
            </Link>
            <span className="text-content-tertiary">/</span>
            <span className="text-sm font-medium text-content-secondary">
              Docs
            </span>
          </div>
          <Link
            href="/app/settings"
            className="rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
          >
            Get API Key
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
