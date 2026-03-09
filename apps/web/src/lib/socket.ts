import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function useSocketRoom(options: {
  room?: string;
  events: string[];
  queryKeys: unknown[][];
  debounceMs?: number;
}) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(options.queryKeys);
  queryKeysRef.current = options.queryKeys;

  useEffect(() => {
    if (!options.room) return;
    const s = getSocket();

    s.emit('join', options.room);

    let timeout: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        for (const key of queryKeysRef.current) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }, options.debounceMs ?? 150);
    };

    for (const event of options.events) {
      s.on(event, handler);
    }

    return () => {
      clearTimeout(timeout);
      for (const event of options.events) {
        s.off(event, handler);
      }
      s.emit('leave', options.room);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.room, ...options.events]);
}
