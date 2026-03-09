'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Copy,
  Check,
  Key,
  Zap,
  ChevronDown,
  Monitor,
  Terminal,
  MessageSquare,
  Sparkles,
  MousePointer2,
  Code2,
  Wind,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Constants ──────────────────────────────────────────────── */

const MCP_URL = 'https://loomknot.com/mcp/sse';

/* ── CodeBlock ──────────────────────────────────────────────── */

function CodeBlock({ code, className }: { code: string; className?: string }) {
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

/* ── Guide Data ─────────────────────────────────────────────── */

type Guide = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: (string | { text: string; code: string })[];
  paths?: Record<string, string>;
  note?: string;
};

const guides: Guide[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    icon: Monitor,
    paths: {
      macOS:
        '~/Library/Application Support/Claude/claude_desktop_config.json',
      Windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
      Linux: '~/.config/Claude/claude_desktop_config.json',
    },
    steps: [
      'Open Claude Desktop → Settings → Developer → Edit Config.',
      {
        text: 'Add the LoomKnot server to your configuration:',
        code: JSON.stringify(
          {
            mcpServers: {
              loomknot: {
                url: MCP_URL,
                headers: { Authorization: 'Bearer YOUR_API_KEY' },
              },
            },
          },
          null,
          2,
        ),
      },
      'Save the file and restart Claude Desktop.',
      'Start a new conversation — Claude will have access to your LoomKnot projects.',
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: Terminal,
    steps: [
      {
        text: 'Add LoomKnot as an MCP server:',
        code: `claude mcp add loomknot \\
  --transport sse \\
  --url ${MCP_URL} \\
  --header "Authorization: Bearer YOUR_API_KEY"`,
      },
      {
        text: 'Verify the connection:',
        code: 'claude mcp list',
      },
      'Start Claude Code — it will now have access to your LoomKnot projects.',
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: MessageSquare,
    steps: [
      'Open ChatGPT Desktop → Settings → Beta Features → enable MCP.',
      'Go to Settings → MCP Servers → Add Server.',
      {
        text: 'Enter the server details:',
        code: JSON.stringify(
          {
            mcpServers: {
              loomknot: {
                url: MCP_URL,
                headers: { Authorization: 'Bearer YOUR_API_KEY' },
              },
            },
          },
          null,
          2,
        ),
      },
      'Click Connect and start a conversation.',
    ],
    note: 'MCP support in ChatGPT may require a Plus subscription. Check OpenAI documentation for the latest setup instructions.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: Sparkles,
    steps: [
      'Open Gemini → Settings → Extensions → MCP Servers.',
      {
        text: 'Add the LoomKnot MCP server:',
        code: `Server URL: ${MCP_URL}\nAuthorization: Bearer YOUR_API_KEY`,
      },
      'Save and start a new conversation.',
    ],
    note: 'MCP support in Gemini may vary by plan and region. Check Google AI documentation for the latest.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    icon: MousePointer2,
    paths: {
      Project: '.cursor/mcp.json',
      Global: '~/.cursor/mcp.json',
    },
    steps: [
      'Open Cursor → Settings → MCP → Add new MCP server.',
      {
        text: 'Or create .cursor/mcp.json in your project root:',
        code: JSON.stringify(
          {
            mcpServers: {
              loomknot: {
                url: MCP_URL,
                headers: { Authorization: 'Bearer YOUR_API_KEY' },
              },
            },
          },
          null,
          2,
        ),
      },
      'Restart Cursor. The LoomKnot tools will appear in the agent panel.',
    ],
  },
  {
    id: 'vscode',
    name: 'VS Code',
    icon: Code2,
    paths: {
      Project: '.vscode/mcp.json',
    },
    steps: [
      {
        text: 'Create .vscode/mcp.json in your project:',
        code: JSON.stringify(
          {
            servers: {
              loomknot: {
                type: 'sse',
                url: MCP_URL,
                headers: { Authorization: 'Bearer YOUR_API_KEY' },
              },
            },
          },
          null,
          2,
        ),
      },
      'Works with Copilot, Cline, Continue.dev, and other MCP-compatible extensions.',
    ],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    icon: Wind,
    paths: {
      Global: '~/.codeium/windsurf/mcp_config.json',
    },
    steps: [
      'Open Windsurf → Settings → MCP Servers.',
      {
        text: 'Or edit the config file directly:',
        code: JSON.stringify(
          {
            mcpServers: {
              loomknot: {
                serverUrl: MCP_URL,
                headers: { Authorization: 'Bearer YOUR_API_KEY' },
              },
            },
          },
          null,
          2,
        ),
      },
      'Restart Windsurf to apply.',
    ],
  },
  {
    id: 'custom',
    name: 'API / Custom',
    icon: Wrench,
    steps: [
      {
        text: 'Connect to the SSE endpoint with your API key:',
        code: `# Establish SSE connection
curl -N -H "Authorization: Bearer YOUR_API_KEY" \\
  ${MCP_URL}

# Send JSON-RPC message (use sessionId from SSE stream)
curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \\
  "https://loomknot.com/mcp/messages?sessionId=SESSION_ID"`,
      },
      'Transport: SSE (Server-Sent Events) via @modelcontextprotocol/sdk.',
      'Protocol: JSON-RPC 2.0 over MCP.',
    ],
  },
];

/* ── MCP Tools Data ─────────────────────────────────────────── */

const toolGroups = [
  {
    category: 'Bootstrap',
    tools: [
      {
        name: 'bootstrap',
        desc: 'Get user info, all projects, and pending tasks. Call this first.',
      },
    ],
  },
  {
    category: 'Projects',
    tools: [
      { name: 'projects/list', desc: 'List all your projects with summaries' },
      {
        name: 'projects/get',
        desc: 'Get project details with members and counts',
      },
      {
        name: 'projects/create',
        desc: 'Create a new project (auto-added as owner)',
      },
    ],
  },
  {
    category: 'Memory',
    tools: [
      {
        name: 'memory/write',
        desc: 'Create or update a memory (private, project, or public)',
      },
      {
        name: 'memory/bulk-write',
        desc: 'Write multiple memories at once (up to 50)',
      },
      {
        name: 'memory/read',
        desc: 'List memories with filtering and pagination',
      },
      {
        name: 'memory/search',
        desc: 'Full-text search across memories',
      },
      { name: 'memory/update', desc: 'Update an existing memory' },
      { name: 'memory/delete', desc: 'Delete a memory' },
    ],
  },
  {
    category: 'Pages',
    tools: [
      { name: 'pages/list', desc: 'List all pages in a project' },
      { name: 'pages/get', desc: 'Get page with content blocks' },
      {
        name: 'pages/create',
        desc: 'Create a page with optional content blocks',
      },
      {
        name: 'pages/update',
        desc: 'Update page metadata and content blocks',
      },
      { name: 'pages/delete', desc: 'Delete a page' },
    ],
  },
  {
    category: 'Tasks',
    tools: [
      { name: 'tasks/list', desc: 'List your tasks with filtering' },
      { name: 'tasks/get', desc: 'Get task details with logs' },
      { name: 'tasks/create', desc: 'Create a task for yourself' },
      { name: 'tasks/update', desc: 'Update task status or add log' },
    ],
  },
  {
    category: 'Negotiations',
    tools: [
      {
        name: 'negotiations/list',
        desc: 'List project negotiations',
      },
      {
        name: 'negotiations/get',
        desc: 'Get negotiation with options and votes',
      },
      {
        name: 'negotiations/propose',
        desc: 'Propose an option for an open negotiation',
      },
    ],
  },
  {
    category: 'Activity',
    tools: [
      {
        name: 'activity/recent',
        desc: 'Get recent activity log for a project',
      },
    ],
  },
];

/* ── ToolsSection ───────────────────────────────────────────── */

function ToolsSection() {
  const t = useTranslations('Docs');
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section id="tools">
      <h2 className="mb-2 text-xl font-semibold text-content">{t('tools')}</h2>
      <p className="mb-6 text-sm text-content-secondary">{t('toolsDesc')}</p>
      <div className="space-y-2">
        {toolGroups.map((group) => (
          <div
            key={group.category}
            className="rounded-md border border-border bg-surface-elevated"
          >
            <button
              onClick={() =>
                setExpanded(
                  expanded === group.category ? null : group.category,
                )
              }
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-alt"
            >
              <span className="text-sm font-medium text-content">
                {group.category}
                <span className="ml-2 text-content-tertiary">
                  ({group.tools.length})
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-content-tertiary transition-transform',
                  expanded === group.category && 'rotate-180',
                )}
              />
            </button>
            {expanded === group.category && (
              <div className="border-t border-border px-4 py-3">
                <div className="space-y-2">
                  {group.tools.map((tool) => (
                    <div key={tool.name} className="flex gap-3">
                      <code className="shrink-0 text-[13px] font-mono text-thread">
                        {tool.name}
                      </code>
                      <span className="text-sm text-content-secondary">
                        {tool.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */

export default function DocsPage() {
  const t = useTranslations('Docs');
  const [activeGuide, setActiveGuide] = useState('claude-desktop');

  const guide = guides.find((g) => g.id === activeGuide)!;

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-content-secondary">
          {t('subtitle')}
        </p>
      </section>

      {/* Quick Start */}
      <section id="quickstart">
        <h2 className="mb-6 text-xl font-semibold text-content">
          {t('quickStart')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              num: '1',
              icon: Key,
              title: t('step1'),
              desc: t('step1Desc'),
            },
            {
              num: '2',
              icon: Zap,
              title: t('step2'),
              desc: t('step2Desc'),
            },
            {
              num: '3',
              icon: Terminal,
              title: t('step3'),
              desc: t('step3Desc'),
            },
          ].map((step) => (
            <div
              key={step.num}
              className="rounded-md border border-border bg-surface-elevated p-5"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-thread/10 text-sm font-semibold text-thread">
                {step.num}
              </div>
              <h3 className="text-sm font-semibold text-content">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-content-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Connection Guides */}
      <section id="guides">
        <h2 className="mb-2 text-xl font-semibold text-content">
          {t('guides')}
        </h2>
        <p className="mb-6 text-sm text-content-secondary">
          {t('replaceKey')}
        </p>

        {/* Tabs */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-none">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGuide(g.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                  activeGuide === g.id
                    ? 'bg-thread text-white'
                    : 'bg-surface-alt text-content-secondary hover:text-content hover:bg-surface-elevated',
                )}
              >
                <Icon className="h-4 w-4" />
                {g.name}
              </button>
            );
          })}
        </div>

        {/* Active guide content */}
        <div className="rounded-md border border-border bg-surface-elevated p-6">
          <div className="mb-4 flex items-center gap-3">
            <guide.icon className="h-5 w-5 text-thread" />
            <h3 className="text-lg font-semibold text-content">{guide.name}</h3>
          </div>

          {/* Config file paths */}
          {guide.paths && (
            <div className="mb-5 rounded-md border border-border bg-surface p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-content-tertiary">
                {t('configPath')}
              </p>
              {Object.entries(guide.paths).map(([os, path]) => (
                <div key={os} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-medium text-content-secondary">
                    {os}:
                  </span>
                  <code className="font-mono text-content">{path}</code>
                </div>
              ))}
            </div>
          )}

          {/* Steps */}
          <ol className="space-y-4">
            {guide.steps.map((step, i) => {
              const isObj = typeof step === 'object';
              return (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-medium text-content-secondary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-content">
                      {isObj ? step.text : step}
                    </p>
                    {isObj && <CodeBlock code={step.code} className="mt-2" />}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Note */}
          {guide.note && (
            <div className="mt-5 rounded-md border border-border bg-surface p-3 text-sm text-content-secondary">
              <span className="font-medium text-content">Note: </span>
              {guide.note}
            </div>
          )}
        </div>
      </section>

      {/* MCP Tools */}
      <ToolsSection />

      {/* Technical Details */}
      <section id="details">
        <h2 className="mb-4 text-xl font-semibold text-content">
          {t('technicalDetails')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              {t('endpoint')}
            </p>
            <code className="mt-1 block text-sm font-mono text-thread">
              {MCP_URL}
            </code>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              {t('transport')}
            </p>
            <p className="mt-1 text-sm text-content">
              SSE (Server-Sent Events)
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              {t('auth')}
            </p>
            <code className="mt-1 block text-sm font-mono text-content">
              Authorization: Bearer lk_...
            </code>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              {t('rateLimit')}
            </p>
            <p className="mt-1 text-sm text-content">
              10 connections/min, 120 messages/min
            </p>
          </div>
        </div>
      </section>

      {/* Need Help */}
      <section className="rounded-md border border-border bg-surface-elevated p-6 text-center">
        <h2 className="text-lg font-semibold text-content">{t('needHelp')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-content-secondary">
          {t('needHelpDesc')}
        </p>
        <Link
          href="/app/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
        >
          <Key className="h-4 w-4" />
          {t('manageKeys')}
        </Link>
      </section>
    </div>
  );
}
