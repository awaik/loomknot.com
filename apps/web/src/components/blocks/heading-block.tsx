'use client';

import type { PageBlock } from '@/hooks/use-pages';

const HEADING_SIZES: Record<string, string> = {
  h1: 'text-2xl font-bold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-semibold',
  h5: 'text-sm font-semibold',
  h6: 'text-sm font-medium',
};

export function HeadingBlock({ block }: { block: PageBlock }) {
  const c = block.content;
  const text = typeof c.text === 'string' ? c.text : '';
  const level = typeof c.level === 'number' ? c.level : 2;
  const Tag = (`h${Math.min(Math.max(level, 1), 6)}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Tag className={`${HEADING_SIZES[Tag]} text-content`}>{text}</Tag>;
}
