'use client';

import { Check, Circle } from 'lucide-react';
import type { PageBlock } from '@/hooks/use-pages';

interface ParsedListItem {
  text: string;
  done?: boolean;
}

function parseListItem(item: unknown): ParsedListItem {
  if (typeof item === 'string') {
    return { text: item };
  }

  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    const text = 'text' in obj ? String(obj.text) : JSON.stringify(item);
    const done = 'done' in obj ? Boolean(obj.done) : undefined;
    return { text, done };
  }

  return { text: JSON.stringify(item) };
}

export function ListBlock({ block }: { block: PageBlock }) {
  const items = Array.isArray(block.content.items) ? block.content.items : [];
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <ul className="space-y-1.5">
        {items.map((item: unknown, i: number) => {
          const { text, done } = parseListItem(item);
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-content">
              {done !== undefined ? (
                done
                  ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" />
              ) : (
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-content-tertiary" />
              )}
              <span className={done ? 'line-through text-content-tertiary' : ''}>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
