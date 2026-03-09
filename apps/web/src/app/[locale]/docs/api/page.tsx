'use client';

import { useTranslations } from 'next-intl';
import { CodeBlock } from '../code-block';

const MCP_URL = 'https://loomknot.com/mcp/sse';

export default function ApiPage() {
  const t = useTranslations('Docs');

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {t('navApi')}
        </h1>
        <p className="mt-2 text-sm text-content-secondary">
          Technical details for integrating with the LoomKnot MCP server.
        </p>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Endpoints</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Endpoint
                </th>
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Method
                </th>
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Auth
                </th>
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated">
              <tr>
                <td className="px-4 py-3 font-mono text-[13px] text-thread">
                  /mcp/health
                </td>
                <td className="px-4 py-3 text-content">GET</td>
                <td className="px-4 py-3 text-content-tertiary">None</td>
                <td className="px-4 py-3 text-content-secondary">
                  Health check
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[13px] text-thread">
                  /mcp/sse
                </td>
                <td className="px-4 py-3 text-content">GET</td>
                <td className="px-4 py-3 text-content">Bearer token</td>
                <td className="px-4 py-3 text-content-secondary">
                  Establish SSE connection
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[13px] text-thread">
                  /mcp/messages
                </td>
                <td className="px-4 py-3 text-content">POST</td>
                <td className="px-4 py-3 text-content">Bearer token</td>
                <td className="px-4 py-3 text-content-secondary">
                  Send JSON-RPC messages
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Connection Flow */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Connection Flow</h2>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <h3 className="text-sm font-semibold text-content mb-2">
              1. Establish SSE Connection
            </h3>
            <CodeBlock
              code={`GET ${MCP_URL}
Authorization: Bearer lk_your_api_key_here
Accept: text/event-stream`}
            />
            <p className="mt-2 text-sm text-content-secondary">
              The server responds with a 200 OK and begins streaming SSE
              events. A session ID is provided in the initial handshake.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <h3 className="text-sm font-semibold text-content mb-2">
              2. Send Messages
            </h3>
            <CodeBlock
              code={`POST /mcp/messages?sessionId=<session_id>
Authorization: Bearer lk_your_api_key_here
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "bootstrap",
    "arguments": {}
  },
  "id": 1
}`}
            />
            <p className="mt-2 text-sm text-content-secondary">
              Messages use JSON-RPC 2.0 format. The session ID from step 1
              must be included as a query parameter. The API key must match
              the one used to establish the session.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Authentication</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Format
            </p>
            <code className="mt-1 block text-sm font-mono text-content">
              Authorization: Bearer lk_...
            </code>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Prefix
            </p>
            <code className="mt-1 block text-sm font-mono text-content">
              lk_
            </code>
            <p className="mt-1 text-xs text-content-tertiary">
              Followed by 64 hex characters
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-4 text-sm text-content-secondary">
          API keys are stored as SHA-256 hashes. The full key is returned only
          once at creation time. If you lose it, revoke and create a new one.
        </div>
      </section>

      {/* Rate Limits */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Rate Limits</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              SSE Connections
            </p>
            <p className="mt-1 text-lg font-semibold text-content">
              10 <span className="text-sm font-normal text-content-secondary">per minute per IP</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Messages
            </p>
            <p className="mt-1 text-lg font-semibold text-content">
              120 <span className="text-sm font-normal text-content-secondary">per minute per IP</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Max Concurrent Sessions
            </p>
            <p className="mt-1 text-lg font-semibold text-content">
              1,000 <span className="text-sm font-normal text-content-secondary">server-wide</span>
            </p>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">Error Handling</h2>
        <p className="text-sm text-content-secondary">
          MCP tool errors are returned as JSON-RPC responses with{' '}
          <code className="font-mono text-[13px]">isError: true</code>:
        </p>
        <CodeBlock
          code={`{
  "content": [
    {
      "type": "text",
      "text": "{\\"error\\": {\\"code\\": \\"NOT_FOUND\\", \\"message\\": \\"Project not found\\"}}"
    }
  ],
  "isError": true
}`}
        />
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Code
                </th>
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated">
              {[
                ['NOT_FOUND', 'Resource not found'],
                ['FORBIDDEN', 'Insufficient permissions for this action'],
                ['VALIDATION', 'Invalid input parameters'],
                ['RATE_LIMITED', 'Too many requests'],
                ['INTERNAL', 'Server error'],
              ].map(([code, desc]) => (
                <tr key={code}>
                  <td className="px-4 py-3 font-mono text-[13px] text-thread">
                    {code}
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* HTTP errors */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">
          HTTP Status Codes
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated">
              {[
                ['401', 'Invalid or missing API key'],
                ['404', 'Session not found (expired or invalid sessionId)'],
                ['503', 'Server at capacity (max sessions reached)'],
              ].map(([status, desc]) => (
                <tr key={status}>
                  <td className="px-4 py-3 font-mono text-[13px] font-medium text-content">
                    {status}
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
