'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Param = {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
};

type Tool = {
  name: string;
  desc: string;
  params?: Param[];
};

const toolGroups: { category: string; desc: string; tools: Tool[] }[] = [
  {
    category: 'Bootstrap',
    desc: 'Initialize your session',
    tools: [
      {
        name: 'bootstrap',
        desc: 'Get user info, all projects, and pending tasks. Call this first when starting a session.',
      },
    ],
  },
  {
    category: 'Projects',
    desc: 'Manage projects',
    tools: [
      {
        name: 'projects_list',
        desc: 'List all projects you are a member of with summaries.',
      },
      {
        name: 'projects_get',
        desc: 'Get project details including members and counts.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
        ],
      },
      {
        name: 'projects_create',
        desc: 'Create a new project. You are automatically added as owner.',
        params: [
          { name: 'title', type: 'string', required: true, desc: 'Project title' },
          { name: 'description', type: 'string', desc: 'Project description' },
          {
            name: 'vertical',
            type: 'enum',
            desc: 'travel | wedding | renovation | education | events | general',
          },
        ],
      },
    ],
  },
  {
    category: 'Memory',
    desc: 'Read and write to the 3-level memory system',
    tools: [
      {
        name: 'memory_write',
        desc: 'Create or update a memory. Upserts by projectId + userId + category + key.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'category', type: 'string', required: true, desc: 'Memory category (e.g. "preferences", "constraints")' },
          { name: 'key', type: 'string', required: true, desc: 'Memory key' },
          { name: 'value', type: 'any', required: true, desc: 'JSON value to store' },
          { name: 'summary', type: 'string', desc: 'Human-readable summary' },
          { name: 'level', type: 'enum', desc: 'private | project | public (default: private)' },
        ],
      },
      {
        name: 'memory_bulk-write',
        desc: 'Write multiple memories at once (max 50).',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'items', type: 'array', required: true, desc: 'Array of memory objects' },
        ],
      },
      {
        name: 'memory_read',
        desc: 'List memories with filtering and cursor pagination. Private memories only visible to owner.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'category', type: 'string', desc: 'Filter by category' },
          { name: 'level', type: 'enum', desc: 'Filter by level: private | project | public' },
          { name: 'limit', type: 'number', desc: 'Max results (default 20, max 100)' },
          { name: 'cursor', type: 'string', desc: 'Pagination cursor' },
        ],
      },
      {
        name: 'memory_search',
        desc: 'Full-text search across memories (ILIKE on key, summary, category).',
        params: [
          { name: 'query', type: 'string', required: true, desc: 'Search query' },
          { name: 'projectId', type: 'string', desc: 'Limit to specific project' },
          { name: 'category', type: 'string', desc: 'Filter by category' },
          { name: 'limit', type: 'number', desc: 'Max results (default 20, max 50)' },
        ],
      },
      {
        name: 'memory_update',
        desc: 'Update an existing memory. Must be the memory owner.',
        params: [
          { name: 'memoryId', type: 'string', required: true, desc: 'Memory ID' },
          { name: 'value', type: 'any', desc: 'New value' },
          { name: 'summary', type: 'string', desc: 'New summary' },
          { name: 'level', type: 'enum', desc: 'New level' },
        ],
      },
      {
        name: 'memory_delete',
        desc: 'Soft-delete a memory. Must be the memory owner.',
        params: [
          { name: 'memoryId', type: 'string', required: true, desc: 'Memory ID' },
        ],
      },
    ],
  },
  {
    category: 'Pages',
    desc: 'Manage project pages and content blocks',
    tools: [
      {
        name: 'pages_list',
        desc: 'List all pages in a project. The slug "index" page is the project main page.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
        ],
      },
      {
        name: 'pages_get',
        desc: 'Get a page with all its content blocks.',
        params: [
          { name: 'pageId', type: 'string', required: true, desc: 'Page ID' },
        ],
      },
      {
        name: 'pages_create',
        desc: 'Create a child page with optional content blocks. Slug "index" is reserved for the project main page; update it after creating child pages.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'title', type: 'string', required: true, desc: 'Page title' },
          { name: 'slug', type: 'string', desc: 'URL slug (auto-generated from title)' },
          { name: 'description', type: 'string', desc: 'Page description' },
          { name: 'status', type: 'enum', desc: 'draft | published | archived' },
          { name: 'blocks', type: 'array', desc: 'Content blocks to create' },
        ],
      },
      {
        name: 'pages_update',
        desc: 'Update page metadata and/or content blocks. After updating a child page, update the index page if the project overview or navigation changed.',
        params: [
          { name: 'pageId', type: 'string', required: true, desc: 'Page ID' },
          { name: 'title', type: 'string', desc: 'New title' },
          { name: 'description', type: 'string', desc: 'New description' },
          { name: 'status', type: 'enum', desc: 'New status' },
          { name: 'blocks', type: 'array', desc: 'Block operations' },
        ],
      },
      {
        name: 'pages_delete',
        desc: 'Soft-delete a page. Cannot delete the index page.',
        params: [
          { name: 'pageId', type: 'string', required: true, desc: 'Page ID' },
        ],
      },
    ],
  },
  {
    category: 'Tasks',
    desc: 'Manage personal tasks and logs',
    tools: [
      {
        name: 'tasks_list',
        desc: 'List your tasks with optional status and project filtering.',
        params: [
          { name: 'status', type: 'enum', desc: 'pending | in_progress | done | failed' },
          { name: 'projectId', type: 'string', desc: 'Filter by project' },
          { name: 'limit', type: 'number', desc: 'Max results' },
          { name: 'cursor', type: 'string', desc: 'Pagination cursor' },
        ],
      },
      {
        name: 'tasks_get',
        desc: 'Get task details with log entries.',
        params: [
          { name: 'taskId', type: 'string', required: true, desc: 'Task ID' },
        ],
      },
      {
        name: 'tasks_create',
        desc: 'Create a task for yourself.',
        params: [
          { name: 'title', type: 'string', required: true, desc: 'Task title' },
          { name: 'prompt', type: 'string', required: true, desc: 'Task prompt / description' },
          { name: 'projectId', type: 'string', desc: 'Associated project' },
          { name: 'priority', type: 'enum', desc: 'low | normal | high | urgent' },
          { name: 'scheduledAt', type: 'string', desc: 'ISO date for scheduling' },
        ],
      },
      {
        name: 'tasks_update',
        desc: 'Update task status, result, or add a log entry.',
        params: [
          { name: 'taskId', type: 'string', required: true, desc: 'Task ID' },
          { name: 'status', type: 'enum', desc: 'New status' },
          { name: 'result', type: 'any', desc: 'JSON result data' },
          { name: 'log', type: 'string', desc: 'Log entry to append' },
        ],
      },
    ],
  },
  {
    category: 'Negotiations',
    desc: 'Resolve preference conflicts between project members',
    tools: [
      {
        name: 'negotiations_list',
        desc: 'List project negotiations with optional status filter.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'status', type: 'enum', desc: 'open | resolved | dismissed' },
        ],
      },
      {
        name: 'negotiations_get',
        desc: 'Get negotiation details with proposed options and votes.',
        params: [
          { name: 'negotiationId', type: 'string', required: true, desc: 'Negotiation ID' },
        ],
      },
      {
        name: 'negotiations_propose',
        desc: 'Propose an option for an open negotiation.',
        params: [
          { name: 'negotiationId', type: 'string', required: true, desc: 'Negotiation ID' },
          { name: 'title', type: 'string', required: true, desc: 'Option title' },
          { name: 'description', type: 'string', desc: 'Option description' },
          { name: 'proposedValue', type: 'any', desc: 'JSON value for the proposal' },
          { name: 'reasoning', type: 'string', desc: 'Why this option is good' },
        ],
      },
    ],
  },
  {
    category: 'Activity',
    desc: 'View project activity logs',
    tools: [
      {
        name: 'activity_recent',
        desc: 'Get recent activity log entries for a project.',
        params: [
          { name: 'projectId', type: 'string', required: true, desc: 'Project ID' },
          { name: 'since', type: 'string', desc: 'ISO date — only entries after this time' },
          { name: 'limit', type: 'number', desc: 'Max results (default 20, max 100)' },
        ],
      },
    ],
  },
];

export default function ToolsPage() {
  const t = useTranslations('Docs');
  const [expanded, setExpanded] = useState<string | null>('Bootstrap');

  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {t('navTools')}
        </h1>
        <p className="mt-2 text-sm text-content-secondary">
          {totalTools} tools across {toolGroups.length} categories that your AI
          agent can use to interact with your LoomKnot projects.
        </p>
      </section>

      <div className="space-y-3">
        {toolGroups.map((group) => (
          <div
            key={group.category}
            className="rounded-md border border-border bg-surface-elevated overflow-hidden"
          >
            <button
              onClick={() =>
                setExpanded(
                  expanded === group.category ? null : group.category,
                )
              }
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-alt"
            >
              <div>
                <span className="text-sm font-semibold text-content">
                  {group.category}
                </span>
                <span className="ml-2 text-xs text-content-tertiary">
                  {group.tools.length}{' '}
                  {group.tools.length === 1 ? 'tool' : 'tools'}
                </span>
                <p className="mt-0.5 text-xs text-content-tertiary">
                  {group.desc}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-content-tertiary transition-transform',
                  expanded === group.category && 'rotate-180',
                )}
              />
            </button>
            {expanded === group.category && (
              <div className="border-t border-border divide-y divide-border">
                {group.tools.map((tool) => (
                  <div key={tool.name} className="px-5 py-4">
                    <code className="text-sm font-mono font-medium text-thread">
                      {tool.name}
                    </code>
                    <p className="mt-1 text-sm text-content-secondary">
                      {tool.desc}
                    </p>
                    {tool.params && tool.params.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-content-tertiary">
                              <th className="pb-2 pr-4 font-medium">Param</th>
                              <th className="pb-2 pr-4 font-medium">Type</th>
                              <th className="pb-2 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tool.params.map((p) => (
                              <tr
                                key={p.name}
                                className="border-b border-border last:border-0"
                              >
                                <td className="py-1.5 pr-4 font-mono text-[13px] text-content">
                                  {p.name}
                                  {p.required && (
                                    <span className="ml-1 text-error">*</span>
                                  )}
                                </td>
                                <td className="py-1.5 pr-4 text-content-tertiary">
                                  {p.type}
                                </td>
                                <td className="py-1.5 text-content-secondary">
                                  {p.desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
