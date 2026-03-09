'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('group relative', className)}>
      <pre className="overflow-x-auto rounded-md border border-border bg-surface p-4 text-[13px] font-mono leading-relaxed text-content">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface-elevated opacity-0 transition-opacity group-hover:opacity-100"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-sage" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-content-tertiary" />
        )}
      </button>
    </div>
  );
}
