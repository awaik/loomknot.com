'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Zap,
  Wrench,
  Layers,
  Shield,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/docs/quickstart', icon: Zap, labelKey: 'navQuickstart' },
  { href: '/docs/tools', icon: Wrench, labelKey: 'navTools' },
  { href: '/docs/concepts', icon: Layers, labelKey: 'navConcepts' },
  { href: '/docs/roles', icon: Shield, labelKey: 'navRoles' },
  { href: '/docs/api', icon: Server, labelKey: 'navApi' },
] as const;

export function DocsNav() {
  const pathname = usePathname();
  const t = useTranslations('Docs');

  return (
    <nav className="hidden lg:block w-44 shrink-0">
      <div className="sticky top-20 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-thread/10 font-medium text-thread'
                  : 'text-content-secondary hover:bg-surface-alt hover:text-content',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
