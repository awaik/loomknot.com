import express from 'express';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { authenticateApiKey } from '@/auth/api-key-auth.js';
import { createMcpServer } from '@/create-server.js';

const app = express();

// Trust Traefik reverse proxy (required for express-rate-limit behind proxy)
app.set('trust proxy', 1);

// --- Constants ---

const SSE_KEEPALIVE_MS = 30_000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — reaper kills idle sessions
const SESSION_REAPER_INTERVAL_MS = 60 * 1000; // reaper sweep every 60s
const MAX_SESSIONS = 1000;
const MAX_SESSIONS_PER_USER = 50;

// Parse JSON body for all routes EXCEPT /mcp/messages.
// SSEServerTransport.handlePostMessage reads the raw request stream,
// so express.json() must not consume it first.
const jsonParser = express.json({ limit: '5mb' });

app.use((req, res, next) => {
  if (req.path === '/mcp/messages') return next();
  jsonParser(req, res, next);
});

// --- Session Management ---

interface McpSession {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  server: McpServer;
  userId: string;
  apiKeyId: string;
  stopKeepalive: (() => void) | null;
  createdAt: number;
  lastActivity: number;
}

/**
 * Attach an SSE keepalive timer to a response stream.
 * Returns a stop function. Also auto-clears on response close.
 * If `session` is provided, bumps `lastActivity` on each keepalive
 * so the reaper doesn't kill sessions with active SSE listeners.
 */
function startSseKeepalive(res: express.Response, session?: McpSession): () => void {
  const timer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(':keepalive\n\n');
      if (session) session.lastActivity = Date.now();
    }
  }, SSE_KEEPALIVE_MS);
  const stop = () => clearInterval(timer);
  res.on('close', stop);
  return stop;
}

const sessions = new Map<string, McpSession>();

/**
 * Close and remove a session. Idempotent — safe to call multiple times
 * (e.g. from res.on('close') + transport.onclose + reaper simultaneously).
 */
async function destroySession(sessionId: string, reason: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.stopKeepalive?.();
  sessions.delete(sessionId);

  const type = session.transport instanceof StreamableHTTPServerTransport ? 'streamable' : 'legacy SSE';
  const ageSec = Math.round((Date.now() - session.createdAt) / 1000);
  console.log(
    `[MCP] session closed (${type}) id=${sessionId.slice(0, 8)}… reason=${reason} age=${ageSec}s remaining=${sessions.size}`,
  );

  try {
    await session.server.close();
  } catch {
    // server may already be closed
  }
}

/**
 * Count active sessions for a user (guards against session hoarding).
 */
function countUserSessions(userId: string): number {
  let count = 0;
  for (const s of sessions.values()) {
    if (s.userId === userId) count++;
  }
  return count;
}

// --- Session Reaper (cleans up leaked / abandoned sessions) ---

const reaperTimer = setInterval(() => {
  const now = Date.now();
  const expired: string[] = [];

  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
      expired.push(id);
    }
  }

  if (expired.length > 0) {
    console.log(`[MCP] reaper: cleaning ${expired.length} idle session(s)`);
    for (const id of expired) {
      destroySession(id, 'idle-timeout').catch(() => {});
    }
  }
}, SESSION_REAPER_INTERVAL_MS);

reaperTimer.unref(); // don't prevent process exit

// --- Rate Limiting ---
//
// POST /mcp/sse serves two purposes: initialize (new session) and tool calls.
// We use `skip` to apply the right limiter based on request type:
// - initLimiter:    counts only initialize requests (max 10/min)
// - messageLimiter: counts only tool call messages  (max 120/min)
//
// GET /mcp/sse serves two purposes: Streamable HTTP SSE stream and legacy SSE.
// - legacySseLimiter: counts only new legacy SSE connections (no mcp-session-id)
//   Existing session GET streams pass through — they're just response channels.

const initLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST' || !isInitializeRequest(req.body),
  message: { error: 'Too many connections, please try again later' },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isInitializeRequest(req.body),
  message: { error: 'Rate limit exceeded, please slow down' },
});

const legacySseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !!req.headers['mcp-session-id'],
  message: { error: 'Too many connections, please try again later' },
});

// --- Health check (public) ---

app.get('/mcp/health', (_req, res) => {
  let streamable = 0;
  let legacy = 0;
  let oldestAgeSec = 0;
  const now = Date.now();

  for (const session of sessions.values()) {
    if (session.transport instanceof StreamableHTTPServerTransport) streamable++;
    else legacy++;
    const age = now - session.createdAt;
    if (age > oldestAgeSec) oldestAgeSec = age;
  }

  res.json({
    status: 'ok',
    service: 'mcp',
    sessions: {
      total: sessions.size,
      streamable,
      legacy,
      oldestAgeSec: Math.round(oldestAgeSec / 1000),
    },
    timestamp: new Date().toISOString(),
  });
});

// --- Streamable HTTP: POST /mcp/sse ---

app.post('/mcp/sse', initLimiter, messageLimiter, async (req, res) => {
  try {
    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    // Initialize → create new session
    if (isInitializeRequest(req.body)) {
      if (sessions.size >= MAX_SESSIONS) {
        res.status(503).json({ error: 'Server at capacity' });
        return;
      }

      if (countUserSessions(auth.userId) >= MAX_SESSIONS_PER_USER) {
        res.status(429).json({ error: 'Too many active sessions for this user' });
        return;
      }

      // Pre-generate sessionId so we can register the session before handleRequest,
      // avoiding a race where onclose fires before session is in the Map.
      const sessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
      });

      const server = createMcpServer(auth.userId, auth.apiKeyId);
      await server.connect(transport);

      const now = Date.now();
      const session: McpSession = {
        transport,
        server,
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        stopKeepalive: null,
        createdAt: now,
        lastActivity: now,
      };
      sessions.set(sessionId, session);
      console.log(
        `[MCP] session created (streamable) id=${sessionId.slice(0, 8)}… user=${auth.userId.slice(0, 12)}… sessions=${sessions.size}`,
      );

      // SDK fires onclose when transport.close() is called (e.g. from server.close()).
      // This covers explicit DELETE and shutdown paths.
      transport.onclose = () => {
        destroySession(sessionId, 'transport-close').catch(() => {});
      };

      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Existing session message → update activity
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id header' });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session || !(session.transport instanceof StreamableHTTPServerTransport)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.apiKeyId !== auth.apiKeyId) {
      res.status(401).json({ error: 'API key does not match session owner' });
      return;
    }

    session.lastActivity = Date.now();
    await session.transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('POST /mcp/sse error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// --- GET /mcp/sse: Streamable HTTP SSE stream or Legacy SSE ---

app.get('/mcp/sse', legacySseLimiter, async (req, res) => {
  try {
    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    // With mcp-session-id → Streamable HTTP SSE notification stream (long-lived)
    // No rate limit — this is just a response stream for an existing session
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session || !(session.transport instanceof StreamableHTTPServerTransport)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      session.lastActivity = Date.now();
      session.stopKeepalive = startSseKeepalive(res, session);

      // Streamable HTTP: SSE GET stream is a reconnectable notification channel.
      // Do NOT destroy the session on close — client can reconnect using the same
      // session ID (e.g. after network hiccups). Cleanup is handled by the reaper
      // (idle timeout) or explicit DELETE from the client.

      await session.transport.handleRequest(req, res);
      return;
    }

    // Without mcp-session-id → Legacy SSE transport (rate-limited above via legacySseLimiter)
    if (sessions.size >= MAX_SESSIONS) {
      res.status(503).json({ error: 'Server at capacity' });
      return;
    }

    if (countUserSessions(auth.userId) >= MAX_SESSIONS_PER_USER) {
      res.status(429).json({ error: 'Too many active sessions for this user' });
      return;
    }

    const server = createMcpServer(auth.userId, auth.apiKeyId);
    const transport = new SSEServerTransport('/mcp/messages', res);

    const now = Date.now();
    const session: McpSession = {
      transport,
      server,
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      stopKeepalive: null,
      createdAt: now,
      lastActivity: now,
    };
    sessions.set(transport.sessionId, session);
    session.stopKeepalive = startSseKeepalive(res, session);

    console.log(
      `[MCP] session created (legacy SSE) id=${transport.sessionId.slice(0, 8)}… user=${auth.userId.slice(0, 12)}… sessions=${sessions.size}`,
    );

    // Legacy SSE: the GET stream IS the session — destroy on close.
    res.on('close', () => {
      destroySession(transport.sessionId, 'sse-disconnect').catch(() => {});
    });

    await server.connect(transport);
  } catch (err) {
    console.error('GET /mcp/sse error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// --- DELETE /mcp/sse: close Streamable HTTP session ---

app.delete('/mcp/sse', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id header' });
      return;
    }

    await destroySession(sessionId, 'client-delete');
    res.status(200).json({ status: 'closed' });
  } catch (err) {
    console.error('DELETE /mcp/sse error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// --- Legacy messages endpoint (POST /mcp/messages) ---

app.post('/mcp/messages', messageLimiter, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session || !(session.transport instanceof SSEServerTransport)) {
      console.warn(`POST /mcp/messages: session not found (sessionId=${sessionId})`);
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth || auth.apiKeyId !== session.apiKeyId) {
      console.warn(`POST /mcp/messages: auth mismatch (sessionId=${sessionId})`);
      res.status(401).json({ error: 'Unauthorized: API key does not match session owner' });
      return;
    }

    session.lastActivity = Date.now();
    await session.transport.handlePostMessage(req, res);
  } catch (err) {
    console.error('POST /mcp/messages error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// --- Start ---

const PORT = process.env.PORT || 43003;

const httpServer = app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/mcp/health`);
  console.log(`  SSE:      http://localhost:${PORT}/mcp/sse`);
});

// --- Graceful Shutdown ---
// Docker Swarm sends SIGTERM on rolling updates. Close all sessions cleanly
// so agents get a proper disconnect instead of a broken pipe.

function gracefulShutdown(signal: string) {
  console.log(`[MCP] ${signal} received, shutting down…`);
  clearInterval(reaperTimer);

  httpServer.close(() => {
    console.log('[MCP] HTTP server closed');
  });

  const ids = [...sessions.keys()];
  if (ids.length === 0) {
    console.log('[MCP] no active sessions, exiting');
    process.exit(0);
  }

  console.log(`[MCP] closing ${ids.length} session(s)…`);
  Promise.all(ids.map((id) => destroySession(id, 'shutdown').catch(() => {})))
    .then(() => {
      console.log('[MCP] all sessions closed, exiting');
      process.exit(0);
    });

  // Force exit if graceful shutdown stalls
  setTimeout(() => {
    console.error('[MCP] shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
