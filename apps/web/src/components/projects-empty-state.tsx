'use client';

import { useTranslations } from 'next-intl';
import { Brain, Layers, Users, Plus, Sparkles } from 'lucide-react';

interface ProjectsEmptyStateProps {
  onCreateProject: () => void;
}

export function ProjectsEmptyState({ onCreateProject }: ProjectsEmptyStateProps) {
  const t = useTranslations('ProjectsEmpty');

  const cards = [
    {
      icon: Brain,
      titleKey: 'memoryTitle' as const,
      descKey: 'memoryDesc' as const,
      accentClass: 'text-thread bg-thread/10',
    },
    {
      icon: Layers,
      titleKey: 'pagesTitle' as const,
      descKey: 'pagesDesc' as const,
      accentClass: 'text-info bg-info/10',
    },
    {
      icon: Users,
      titleKey: 'teamTitle' as const,
      descKey: 'teamDesc' as const,
      accentClass: 'text-sage bg-sage/10',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative rounded-lg border border-border bg-surface-elevated px-6 py-10 text-center sm:px-10 sm:py-14 overflow-hidden">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-thread/8 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-thread/10">
            <Sparkles className="h-7 w-7 text-thread" />
          </div>

          <h2 className="text-2xl font-bold text-content sm:text-3xl">
            {t('heroTitle')}
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-base text-content-secondary leading-relaxed">
            {t('heroDesc')}
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.titleKey}
            className="rounded-lg border border-border bg-surface-elevated p-5 transition-all duration-fast hover:border-thread/20 hover:shadow-sm"
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.accentClass}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-content">
              {t(card.titleKey)}
            </h3>
            <p className="mt-1.5 text-sm text-content-secondary leading-relaxed">
              {t(card.descKey)}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2 rounded-md bg-thread px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-fast hover:bg-thread-dark hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t('createButton')}
        </button>
        <p className="text-xs text-content-tertiary">
          {t('hint')}
        </p>
      </div>
    </div>
  );
}
