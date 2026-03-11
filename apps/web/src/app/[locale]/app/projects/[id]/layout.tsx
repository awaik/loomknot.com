'use client';

import { use } from 'react';
import { useSocketRoom } from '@/lib/socket';
import { EVENTS, ROOMS } from '@loomknot/shared';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  useSocketRoom({
    room: ROOMS.project(id),
    events: [
      EVENTS.PAGE_CREATED,
      EVENTS.PAGE_UPDATED,
      EVENTS.MEMORY_CREATED,
      EVENTS.MEMORY_UPDATED,
      EVENTS.MEMBER_JOINED,
      EVENTS.PROJECT_UPDATED,
    ],
    queryKeys: [
      ['project', id],
      ['pages', id],
      ['memories', id],
      ['members', id],
      ['activity', id],
    ],
  });

  return <>{children}</>;
}
