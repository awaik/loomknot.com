'use client';

import { BLOCK_TYPES } from '@loomknot/shared';
import type { PageBlock } from '@/hooks/use-pages';
import { HeadingBlock } from './heading-block';
import { TextBlock } from './text-block';
import { ImageBlock } from './image-block';
import { GalleryBlock } from './gallery-block';
import { ListBlock } from './list-block';
import { ItineraryBlock } from './itinerary-block';
import { PlaceBlock } from './place-block';
import { BudgetBlock } from './budget-block';
import { MapBlock } from './map-block';

type BlockComponent = (props: { block: PageBlock }) => React.ReactNode;

const BLOCK_RENDERERS: Record<string, BlockComponent> = {
  [BLOCK_TYPES.heading]: HeadingBlock,
  [BLOCK_TYPES.text]: TextBlock,
  [BLOCK_TYPES.image]: ImageBlock,
  [BLOCK_TYPES.gallery]: GalleryBlock,
  [BLOCK_TYPES.list]: ListBlock,
  [BLOCK_TYPES.itinerary]: ItineraryBlock,
  [BLOCK_TYPES.place]: PlaceBlock,
  [BLOCK_TYPES.budget]: BudgetBlock,
  [BLOCK_TYPES.map]: MapBlock,
};

export function BlockRenderer({ block }: { block: PageBlock }) {
  const Renderer = BLOCK_RENDERERS[block.type];

  if (Renderer) {
    return <Renderer block={block} />;
  }

  // Unknown block type — raw JSON fallback
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-pill bg-surface-alt px-2 py-0.5 text-xs font-medium text-content-secondary">
          {block.type}
        </span>
      </div>
      <pre className="overflow-x-auto rounded-sm bg-surface-sunken p-3 text-xs text-content-secondary font-mono">
        {JSON.stringify(block.content, null, 2)}
      </pre>
    </div>
  );
}
