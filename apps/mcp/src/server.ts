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
app.use(express.json());

// --- Session Management ---

interface McpSession {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  server: McpServer;
  userId: string;
  apiKeyId: string;
}

const sessions = new Map<string, McpSession>();

const MAX_SESSIONS = 1000;

// --- Rate Limiting ---

const connectionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connections, please try again later' },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded, please slow down' },
});

// --- Health check (public) ---

app.get('/mcp/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp',
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

// --- Streamable HTTP: POST /mcp/sse ---

app.post('/mcp/sse', connectionLimiter, async (req, res) => {
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

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createMcpServer(auth.userId, auth.apiKeyId);
      await server.connect(transport);

      const sessionId = transport.sessionId!;
      sessions.set(sessionId, {
        transport,
        server,
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
      });

      transport.onclose = () => {
        sessions.delete(sessionId);
      };

      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Existing session message
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

    await session.transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('POST /mcp/sse error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// --- GET /mcp/sse: Streamable HTTP SSE stream or Legacy SSE ---

app.get('/mcp/sse', connectionLimiter, async (req, res) => {
  try {
    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    // With mcp-session-id → Streamable HTTP SSE notification stream
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session || !(session.transport instanceof StreamableHTTPServerTransport)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      await session.transport.handleRequest(req, res);
      return;
    }

    // Without mcp-session-id → Legacy SSE transport
    if (sessions.size >= MAX_SESSIONS) {
      res.status(503).json({ error: 'Server at capacity' });
      return;
    }

    const server = createMcpServer(auth.userId, auth.apiKeyId);
    const transport = new SSEServerTransport('/mcp/messages', res);

    sessions.set(transport.sessionId, {
      transport,
      server,
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
    });

    res.on('close', () => {
      server.close().catch(() => {});
      sessions.delete(transport.sessionId);
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

    const session = sessions.get(sessionId);
    if (session) {
      await session.server.close();
      sessions.delete(sessionId);
    }

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
    const sessionId = req.query.sessionId as string;
    const session = sessions.get(sessionId);

    if (!session || !(session.transport instanceof SSEServerTransport)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const auth = await authenticateApiKey(req.headers.authorization ?? '');
    if (!auth || auth.apiKeyId !== session.apiKeyId) {
      res.status(401).json({ error: 'Unauthorized: API key does not match session owner' });
      return;
    }

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

app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/mcp/health`);
  console.log(`  SSE:      http://localhost:${PORT}/mcp/sse`);
});
