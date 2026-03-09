'use client';

import { cn } from '@/lib/utils';

type StatusVariant =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'failed'
  | 'draft'
  | 'published'
  | 'archived'
  | 'active'
  | 'revoked';

const variantStyles: Record<StatusVariant, string> = {
  pending: 'bg-warning-soft text-warning',
  in_progress: 'bg-info-soft text-info',
  done: 'bg-success-soft text-success',
  failed: 'bg-error-soft text-error',
  draft: 'bg-surface-alt text-content-secondary',
  published: 'bg-success-soft text-success',
  archived: 'bg-surface-alt text-content-tertiary',
  active: 'bg-success-soft text-success',
  revoked: 'bg-error-soft text-error',
};

const variantLabels: Record<StatusVariant, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  failed: 'Failed',
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  active: 'Active',
  revoked: 'Revoked',
};

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
        variantStyles[status],
        className,
      )}
    >
      {variantLabels[status]}
    </span>
  );
}
