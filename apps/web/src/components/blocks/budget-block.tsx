'use client';

import type { PageBlock } from '@/hooks/use-pages';

export function BudgetBlock({ block }: { block: PageBlock }) {
  const c = block.content;
  const items = Array.isArray(c.items) ? c.items : [];
  const currency = typeof c.currency === 'string' ? c.currency : '';

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {items.map((item: Record<string, unknown>, i: number) => (
            <tr key={i}>
              <td className="py-2 text-content font-medium capitalize">{String(item.category ?? '')}</td>
              <td className="py-2 text-right text-content-secondary whitespace-nowrap">
                {typeof item.amount === 'number' && (
                  <>
                    {item.amount} {currency}
                    {typeof item.per === 'string' && <span className="text-content-tertiary"> / {item.per}</span>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
