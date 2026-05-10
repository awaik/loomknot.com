import express from 'express';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { authenticateApiKey } from '@/auth/api-key-auth.js';
import { createMcpServer } from '@/create-server.js';
import { db } from '@/services/db.js';
import { startIdempotencyCleanup } from '@/utils/idempotency.js';

const app = express();

// Trust Traefik reverse proxy (required for express-rate-limit behind proxy)
app.set('trust proxy', 1);

// --- Constants ---

const SSE_KEEPALIVE_MS = 30_000;
const STREAMABLE_SESSION_IDLE_TIMEOUT_MS = readPositiveIntEnv(
  'MCP_STREAMABLE_SESSION_IDLE_TIMEOUT_MS',
  12 * 60 * 60 * 1000,
); // 12h — agent clients often keep conversations open between bursts
const LEGACY_SESSION_IDLE_TIMEOUT_MS = readPositiveIntEnv(
  'MCP_LEGACY_SESSION_IDLE_TIMEOUT_MS',
  30 * 60 * 1000,
); // 30 min — legacy SSE sessions are tied to an open response stream
const SESSION_REAPER_INTERVAL_MS = readPositiveIntEnv('MCP_SESSION_REAPER_INTERVAL_MS', 60 * 1000);
const HEALTH_DB_CACHE_MS = readPositiveIntEnv('MCP_HEALTH_DB_CACHE_MS', 5_000);
const MAX_SESSIONS = 1000;
const MAX_SESSIONS_PER_USER = 50;
const MCP_ENDPOINTS = ['/mcp', '/mcp/sse'];

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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
  stopKeepalives: Set<() => void>;
  createdAt: number;
  lastActivity: number;
}

/**
 * Attach an SSE keepalive timer to a response stream.
 * Returns a stop function. The caller owns response close cleanup.
 * If `session` is provided, bumps `lastActivity` on each keepalive
 * so the reaper doesn't kill sessions with active SSE listeners.
 */
function startSseKeepalive(res: express.Response, session?: McpSession): () => void {
  let timer: NodeJS.Timeout;
  const stop = () => clearInterval(timer);

  timer = setInterval(() => {
    if (!res.writableEnded) {
      try {
        res.write(':keepalive\n\n');
        if (session) session.lastActivity = Date.now();
      } catch (err) {
        console.warn('[MCP] SSE keepalive failed:', err);
        stop();
      }
    }
  }, SSE_KEEPALIVE_MS);

  return stop;
}

const sessions = new Map<string, McpSession>();

function addKeepalive(session: McpSession, res: express.Response): void {
  const stop = startSseKeepalive(res, session);
  session.stopKeepalives.add(stop);
  res.on('close', () => {
    stop();
    session.stopKeepalives.delete(stop);
    if (session.transport instanceof StreamableHTTPServerTransport) {
      // Streamable HTTP sessions intentionally survive SSE stream reconnects.
      session.lastActivity = Date.now();
    }
  });
}

function idleTimeoutFor(session: McpSession): number {
  return session.transport instanceof StreamableHTTPServerTransport
    ? STREAMABLE_SESSION_IDLE_TIMEOUT_MS
    : LEGACY_SESSION_IDLE_TIMEOUT_MS;
}

function sendSessionNotFound(
  res: express.Response,
  sessionId: string | undefined,
  transport: 'streamable' | 'legacy SSE',
): void {
  console.warn(
    `[MCP] stale ${transport} session id=${sessionId?.slice(0, 8) ?? 'missing'}…; client must reinitialize`,
  );
  res.status(404).json({
    error: 'Session expired or not found',
    code: 'SESSION_EXPIRED',
    hint: 'Reinitialize the MCP connection and retry the request.',
  });
}

/**
 * Close and remove a session. Idempotent — safe to call multiple times
 * (e.g. from res.on('close') + transport.onclose + reaper simultaneously).
 */
async function destroySession(sessionId: string, reason: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  for (const stop of session.stopKeepalives) {
    stop();
  }
  session.stopKeepalives.clear();
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
    if (now - session.lastActivity > idleTimeoutFor(session)) {
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

let healthDbCache: { expiresAt: number; ok: boolean; latencyMs: number | null } = {
  expiresAt: 0,
  ok: true,
  latencyMs: null,
};

async function checkDbHealth(force: boolean): Promise<{ ok: boolean; latencyMs: number | null }> {
  const now = Date.now();
  if (!force && now < healthDbCache.expiresAt) {
    return { ok: healthDbCache.ok, latencyMs: healthDbCache.latencyMs };
  }

  const dbStart = performance.now();
  try {
    await db.execute(sql`select 1`);
    healthDbCache = {
      expiresAt: now + HEALTH_DB_CACHE_MS,
      ok: true,
      latencyMs: Math.round(performance.now() - dbStart),
    };
  } catch (err) {
    console.error('[MCP] health DB check failed:', err);
    healthDbCache = {
      expiresAt: now + HEALTH_DB_CACHE_MS,
      ok: false,
      latencyMs: null,
    };
  }

  return { ok: healthDbCache.ok, latencyMs: healthDbCache.latencyMs };
}

app.get('/mcp/health', async (req, res) => {
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

  const dbHealth = await checkDbHealth(req.query.deep === '1');

  res.status(dbHealth.ok ? 200 : 503).json({
    status: dbHealth.ok ? 'ok' : 'degraded',
    service: 'mcp',
    db: {
      status: dbHealth.ok ? 'ok' : 'error',
      latencyMs: dbHealth.latencyMs,
      cacheTtlMs: Math.max(0, healthDbCache.expiresAt - Date.now()),
    },
    sessions: {
      total: sessions.size,
      streamable,
      legacy,
      oldestAgeSec: Math.round(oldestAgeSec / 1000),
      streamableIdleTimeoutSec: Math.round(STREAMABLE_SESSION_IDLE_TIMEOUT_MS / 1000),
      legacyIdleTimeoutSec: Math.round(LEGACY_SESSION_IDLE_TIMEOUT_MS / 1000),
    },
    timestamp: new Date().toISOString(),
  });
});

// --- Streamable HTTP: POST /mcp or /mcp/sse ---

app.post(MCP_ENDPOINTS, initLimiter, messageLimiter, async (req, res) => {
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
        stopKeepalives: new Set(),
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
      sendSessionNotFound(res, sessionId, 'streamable');
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

// --- GET /mcp or /mcp/sse: Streamable HTTP SSE stream or Legacy SSE ---

app.get(MCP_ENDPOINTS, legacySseLimiter, async (req, res) => {
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
        sendSessionNotFound(res, sessionId, 'streamable');
        return;
      }

      session.lastActivity = Date.now();
      addKeepalive(session, res);

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
      stopKeepalives: new Set(),
      createdAt: now,
      lastActivity: now,
    };
    sessions.set(transport.sessionId, session);
    addKeepalive(session, res);

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

// --- DELETE /mcp or /mcp/sse: close Streamable HTTP session ---

app.delete(MCP_ENDPOINTS, async (req, res) => {
  try {
    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id header' });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      sendSessionNotFound(res, sessionId, 'streamable');
      return;
    }

    if (session.apiKeyId !== auth.apiKeyId) {
      res.status(401).json({ error: 'API key does not match session owner' });
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
      sendSessionNotFound(res, sessionId, 'legacy SSE');
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

const stopIdempotencyCleanup = startIdempotencyCleanup();

// --- Graceful Shutdown ---
// Docker Swarm sends SIGTERM on rolling updates. Close all sessions cleanly
// so agents get a proper disconnect instead of a broken pipe.

function gracefulShutdown(signal: string) {
  console.log(`[MCP] ${signal} received, shutting down…`);
  clearInterval(reaperTimer);
  stopIdempotencyCleanup();

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
