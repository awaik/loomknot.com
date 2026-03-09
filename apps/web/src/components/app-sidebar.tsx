'use client';

import { useState } from 'react';
import {
  FolderKanban,
  Plus,
  ListTodo,
  Settings,
  LogOut,
  ChevronRight,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAuthStore, logout } from '@/lib/auth';
import { useProjects } from '@/hooks/use-projects';
import { Link, usePathname } from '@/i18n/navigation';
import { CreateProjectDialog } from './create-project-dialog';
import { LanguageSwitcher } from './language-switcher';

export function AppSidebar() {
  const t = useTranslations('App');
  const { user } = useAuthStore();
  const { data: projects } = useProjects();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const navItems = [
    { href: '/app/tasks', label: t('tasks'), icon: ListTodo },
    { href: '/app/settings', label: t('settings'), icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <Link href="/app" className="flex items-center gap-2">
          <svg viewBox="0 0 64 64" className="w-6 h-6 shrink-0">
            <ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(-45 32 32)" fill="#4CAF50" />
            <ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(45 32 32)" fill="#2196F3" />
            <circle cx="32" cy="32" r="8" fill="#FFFFFF" />
            <ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(-45 32 32)" fill="none" stroke="#2196F3" strokeWidth="5" />
            <ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(45 32 32)" fill="none" stroke="#4CAF50" strokeWidth="5" />
          </svg>
          <span className="text-lg font-semibold text-content">
            Loom<span className="text-thread">knot</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Projects section */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-content-tertiary px-1">
              {t('projects')}
            </span>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-thread"
              title={t('newProject')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-0.5">
              {projects.map((project) => {
                const projectPath = `/app/projects/${project.id}`;
                const isActive = pathname.startsWith(projectPath);

                return (
                  <Link
                    key={project.id}
                    href={projectPath}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-thread/10 text-thread font-medium'
                        : 'text-content-secondary hover:bg-surface-alt hover:text-content',
                    )}
                  >
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    <span className="truncate">{project.title}</span>
                    <ChevronRight
                      className={cn(
                        'ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity',
                        'group-hover:opacity-100',
                        isActive && 'opacity-100',
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-3 text-xs text-content-tertiary">
              {t('noProjects')}
            </p>
          )}
        </div>

        {/* Nav links */}
        <div className="mt-4 px-3 border-t border-border pt-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-thread/10 text-thread font-medium'
                    : 'text-content-secondary hover:bg-surface-alt hover:text-content',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        {/* Language switcher */}
        <LanguageSwitcher
          variant="sidebar"
          icon={<Globe className="h-4 w-4" />}
          label={t('language')}
        />

        {/* User */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-thread/10 text-sm font-medium text-thread">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-content">
              {user?.name ?? 'User'}
            </p>
            <p className="truncate text-xs text-content-tertiary">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-error"
            title={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 flex h-10 w-10 items-center justify-center rounded-sm bg-surface-elevated border border-border shadow-sm text-content-secondary transition-colors hover:bg-surface-alt lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-dvh w-64 bg-surface-elevated border-r border-border transition-transform duration-normal lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Create project dialog */}
      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
