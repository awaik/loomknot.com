'use client';

import { MapPin, Star } from 'lucide-react';
import type { PageBlock } from '@/hooks/use-pages';

export function PlaceBlock({ block }: { block: PageBlock }) {
  const c = block.content;
  const name = typeof c.name === 'string' ? c.name : '';
  const category = typeof c.category === 'string' ? c.category : undefined;
  const rating = typeof c.rating === 'number' ? c.rating : undefined;
  const priceLevel = typeof c.priceLevel === 'string' ? c.priceLevel : undefined;
  const address = typeof c.address === 'string' ? c.address : undefined;

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-thread" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-content">{name}</span>
            {category && (
              <span className="rounded-pill bg-surface-alt px-1.5 py-0.5 text-xs text-content-tertiary">{category}</span>
            )}
            {priceLevel && (
              <span className="text-xs text-content-tertiary">{priceLevel}</span>
            )}
          </div>
          {address && <p className="mt-0.5 text-xs text-content-secondary">{address}</p>}
          {rating !== undefined && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-content-secondary">{rating}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
