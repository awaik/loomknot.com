'use client';

import { useEffect } from 'react';
import { initAuth } from '@/lib/auth';

export function AuthInit() {
  useEffect(() => {
    initAuth();
  }, []);

  return null;
}
