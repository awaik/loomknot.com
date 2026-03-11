'use client';

import type { PageBlock } from '@/hooks/use-pages';
import { Markdown } from '@/components/markdown';

export function TextBlock({ block }: { block: PageBlock }) {
  const c = block.content;
  const text = typeof c.text === 'string' ? c.text : JSON.stringify(c);
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <Markdown>{text}</Markdown>
    </div>
  );
}
