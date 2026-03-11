'use client';

import { use, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Clock,
  Check,
  Circle,
  Star,
} from 'lucide-react';
import { useProjectPage, type PageBlock } from '@/hooks/use-pages';
import { useProject } from '@/hooks/use-projects';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS, BLOCK_TYPES } from '@loomknot/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Markdown } from '@/components/markdown';

export default function PageViewerPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const t = useTranslations('PageViewer');
  const { id, pageId } = use(params);
  const { data: page, isLoading } = useProjectPage(id, pageId);
  const { data: project } = useProject(id);

  useSocketRoom({
    room: ROOMS.page(pageId),
    events: [EVENTS.PAGE_UPDATED],
    queryKeys: [['page', pageId]],
  });

  const sortedBlocks = useMemo(
    () => (page?.blocks ? [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [page?.blocks],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-surface-alt" />
        <div className="h-4 w-96 rounded bg-surface-alt" />
        <div className="mt-6 h-96 rounded-md bg-surface-alt" />
      </div>
    );
  }

  if (!page) {
    return (
      <EmptyState
        icon={FileText}
        title={t('notFound')}
        description={t('notFoundDesc')}
        action={
          <Link
            href={`/app/projects/${id}`}
            className="flex items-center gap-1.5 text-sm text-thread transition-colors hover:text-thread-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToProject')}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={page.title}
        description={page.description ?? undefined}
        breadcrumbs={[
          { label: t('breadcrumbProjects'), href: '/app' },
          { label: project?.title ?? '...', href: `/app/projects/${id}` },
          { label: page.title },
        ]}
        actions={<StatusBadge status={page.status} />}
      />

      {/* Blocks */}
      {sortedBlocks.length > 0 ? (
        <div className="space-y-4">
          {sortedBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={t('noBlocksTitle')}
          description={t('noBlocksDesc')}
          className="py-8"
        />
      )}
    </>
  );
}

const HEADING_SIZES: Record<string, string> = {
  h1: 'text-2xl font-bold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-semibold',
  h5: 'text-sm font-semibold',
  h6: 'text-sm font-medium',
};

function BlockRenderer({ block }: { block: PageBlock }) {
  const c = block.content;

  switch (block.type) {
    case BLOCK_TYPES.heading: {
      const text = typeof c.text === 'string' ? c.text : '';
      const level = typeof c.level === 'number' ? c.level : 2;
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag className={`${HEADING_SIZES[Tag]} text-content`}>{text}</Tag>;
    }

    case BLOCK_TYPES.text: {
      const text = typeof c.text === 'string' ? c.text : JSON.stringify(c);
      return (
        <div className="rounded-md border border-border bg-surface-elevated p-4">
          <Markdown>{text}</Markdown>
        </div>
      );
    }

    case BLOCK_TYPES.image: {
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

    case BLOCK_TYPES.gallery: {
      const images = Array.isArray(c.images) ? c.images : [];
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

    case BLOCK_TYPES.list: {
      const items = Array.isArray(c.items) ? c.items : [];
      return (
        <div className="rounded-md border border-border bg-surface-elevated p-4">
          <ul className="space-y-1.5">
            {items.map((item: unknown, i: number) => {
              const text = typeof item === 'string' ? item : typeof item === 'object' && item !== null && 'text' in item ? String((item as Record<string, unknown>).text) : JSON.stringify(item);
              const done = typeof item === 'object' && item !== null && 'done' in item ? Boolean((item as Record<string, unknown>).done) : undefined;
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-content">
                  {done !== undefined ? (
                    done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" />
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

    case BLOCK_TYPES.itinerary: {
      const items = Array.isArray(c.items) ? c.items : [];
      const dayNumber = typeof c.dayNumber === 'number' ? c.dayNumber : undefined;
      const date = typeof c.date === 'string' ? c.date : undefined;
      const header = dayNumber ? `Day ${dayNumber}` : date ?? undefined;
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

    case BLOCK_TYPES.place: {
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

    case BLOCK_TYPES.budget: {
      const items = Array.isArray(c.items) ? c.items : [];
      const currency = typeof c.currency === 'string' ? c.currency : '';
      return (
        <div className="rounded-md border border-border bg-surface-elevated p-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {items.map((item: Record<string, unknown>, i: number) => (
                <tr key={i}>
                  <td className="py-2 text-content font-medium capitalize">{String(item.category ?? '')}</td>
                  <td className="py-2 text-right text-content-secondary whitespace-nowrap">
                    {typeof item.amount === 'number' && (
                      <>
                        {item.amount} {currency}
                        {typeof item.per === 'string' && <span className="text-content-tertiary"> / {item.per}</span>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case BLOCK_TYPES.map: {
      // Map requires a JS map library — render placeholder with marker info
      const markers = Array.isArray(c.markers) ? c.markers : [];
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

    default: {
      // Unknown block type — raw JSON fallback
      return (
        <div className="rounded-md border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-pill bg-surface-alt px-2 py-0.5 text-xs font-medium text-content-secondary">
              {block.type}
            </span>
          </div>
          <pre className="overflow-x-auto rounded-sm bg-surface-sunken p-3 text-xs text-content-secondary font-mono">
            {JSON.stringify(c, null, 2)}
          </pre>
        </div>
      );
    }
  }
}
