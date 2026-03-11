'use client';

import type { PageBlock } from '@/hooks/use-pages';

export function GalleryBlock({ block }: { block: PageBlock }) {
  const images = Array.isArray(block.content.images) ? block.content.images : [];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((img: Record<string, unknown>, i: number) => (
        <figure key={i} className="rounded-md border border-border bg-surface-elevated overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={typeof img.url === 'string' ? img.url : ''}
            alt={typeof img.alt === 'string' ? img.alt : ''}
            className="w-full aspect-square object-cover"
          />
          {typeof img.caption === 'string' && (
            <figcaption className="px-3 py-1.5 text-xs text-content-secondary">{img.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
