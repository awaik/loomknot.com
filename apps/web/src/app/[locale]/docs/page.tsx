import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Zap,
  Wrench,
  Layers,
  Shield,
  Server,
  ArrowRight,
} from 'lucide-react';

const sections = [
  {
    href: '/docs/quickstart',
    icon: Zap,
    titleKey: 'navQuickstart',
    descKey: 'indexQuickstartDesc',
  },
  {
    href: '/docs/tools',
    icon: Wrench,
    titleKey: 'navTools',
    descKey: 'indexToolsDesc',
  },
  {
    href: '/docs/concepts',
    icon: Layers,
    titleKey: 'navConcepts',
    descKey: 'indexConceptsDesc',
  },
  {
    href: '/docs/roles',
    icon: Shield,
    titleKey: 'navRoles',
    descKey: 'indexRolesDesc',
  },
  {
    href: '/docs/api',
    icon: Server,
    titleKey: 'navApi',
    descKey: 'indexApiDesc',
  },
] as const;

export default function DocsIndexPage() {
  const t = useTranslations('Docs');

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          {t('indexTitle')}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-content-secondary">
          {t('indexSubtitle')}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-start gap-4 rounded-md border border-border bg-surface-elevated p-5 transition-colors hover:border-thread/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-thread/10">
                <Icon className="h-5 w-5 text-thread" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-content group-hover:text-thread transition-colors">
                  {t(section.titleKey)}
                </h2>
                <p className="mt-1 text-sm text-content-secondary">
                  {t(section.descKey)}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-thread" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
