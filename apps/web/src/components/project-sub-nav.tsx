'use client';

import { Activity, Brain, FileText, Home, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/i18n/navigation';

const navItems = [
  { key: 'main', segment: '', icon: Home, labelKey: 'tabMain' },
  { key: 'pages', segment: '/pages', icon: FileText, labelKey: 'tabPages' },
  { key: 'memory', segment: '/memory', icon: Brain, labelKey: 'tabMemories' },
  { key: 'activity', segment: '/activity', icon: Activity, labelKey: 'tabActivity' },
  { key: 'members', segment: '/members', icon: Users, labelKey: 'tabMembers' },
] as const;

interface ProjectSubNavProps {
  projectId: string;
}

export function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  const t = useTranslations('Project');
  const pathname = usePathname();
  const basePath = `/app/projects/${projectId}`;

  return (
    <nav className="flex border-b border-border mb-6">
      {navItems.map((item) => {
        const href = `${basePath}${item.segment}`;
        const isActive =
          item.key === 'main'
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(`${basePath}/${item.key}`);

        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-thread text-thread'
                : 'border-transparent text-content-secondary hover:text-content hover:border-border-strong',
            )}
          >
            <item.icon className="h-4 w-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
