'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const REMARK_PLUGINS = [remarkGfm];

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        // Headings
        'prose-headings:text-content prose-headings:font-semibold',
        // Body text
        'prose-p:text-content prose-p:leading-relaxed',
        // Links
        'prose-a:text-thread prose-a:no-underline hover:prose-a:text-thread-glow hover:prose-a:underline',
        // Lists
        'prose-li:text-content prose-li:marker:text-content-tertiary',
        // Strong/emphasis
        'prose-strong:text-content prose-strong:font-semibold',
        'prose-em:text-content',
        // Code
        'prose-code:text-thread prose-code:bg-surface-sunken prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-surface-sunken prose-pre:border prose-pre:border-border prose-pre:rounded-md',
        // Blockquotes
        'prose-blockquote:border-thread/30 prose-blockquote:text-content-secondary prose-blockquote:not-italic',
        // Tables
        'prose-th:text-content prose-td:text-content-secondary',
        'prose-thead:border-border-strong prose-tr:border-border',
        // Horizontal rules
        'prose-hr:border-border',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{children}</ReactMarkdown>
    </div>
  );
}
