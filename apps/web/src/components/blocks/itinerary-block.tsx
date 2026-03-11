'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PageBlock } from '@/hooks/use-pages';

export function ItineraryBlock({ block }: { block: PageBlock }) {
  const t = useTranslations('PageViewer');
  const c = block.content;
  const items = Array.isArray(c.items) ? c.items : [];
  const dayNumber = typeof c.dayNumber === 'number' ? c.dayNumber : undefined;
  const date = typeof c.date === 'string' ? c.date : undefined;
  const header = dayNumber ? t('itineraryDay', { day: dayNumber }) : date ?? undefined;

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      {header && <p className="text-sm font-semibold text-content mb-3">{header}</p>}
      <div className="space-y-2.5 border-l-2 border-border pl-4">
        {items.map((item: Record<string, unknown>, i: number) => (
          <div key={i} className="relative">
            <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-thread bg-surface" />
            <div className="flex items-baseline gap-2">
              {typeof item.time === 'string' && (
                <span className="flex items-center gap-1 text-xs font-medium text-content-tertiary whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </span>
              )}
              <span className="text-sm font-medium text-content">{String(item.title ?? '')}</span>
              {typeof item.duration === 'string' && (
                <span className="text-xs text-content-tertiary">({item.duration})</span>
              )}
            </div>
            {typeof item.notes === 'string' && (
              <p className="mt-0.5 text-xs text-content-secondary">{item.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
