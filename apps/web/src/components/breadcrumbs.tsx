'use client';

import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-content-tertiary" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-content-secondary transition-colors hover:text-content"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-content-tertiary truncate max-w-48">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
