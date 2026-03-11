'use client';

import type { PageBlock } from '@/hooks/use-pages';

export function ImageBlock({ block }: { block: PageBlock }) {
  const c = block.content;
  const url = typeof c.url === 'string' ? c.url : '';
  const alt = typeof c.alt === 'string' ? c.alt : '';
  const caption = typeof c.caption === 'string' ? c.caption : undefined;
  return (
    <figure className="rounded-md border border-border bg-surface-elevated overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="w-full object-cover" />
      {caption && (
        <figcaption className="px-4 py-2 text-sm text-content-secondary">{caption}</figcaption>
      )}
    </figure>
  );
}
