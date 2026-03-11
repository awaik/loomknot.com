'use client';

import { MapPin } from 'lucide-react';
import type { PageBlock } from '@/hooks/use-pages';

export function MapBlock({ block }: { block: PageBlock }) {
  const markers = Array.isArray(block.content.markers) ? block.content.markers : [];
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-thread" />
        <span className="text-sm font-medium text-content">Map</span>
      </div>
      {markers.length > 0 && (
        <ul className="space-y-1">
          {markers.map((m: Record<string, unknown>, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm text-content-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-thread shrink-0" />
              {String(m.label ?? `${m.lat}, ${m.lng}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
