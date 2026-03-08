'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    setThemeState(saved === 'dark' ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
    localStorage.setItem('theme', t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(next);
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme } as const;
}
