import express from 'express';
import rateLimit from 'express-rate-limit';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { authenticateApiKey } from '@/auth/api-key-auth';
import { createMcpServer } from '@/create-server';

const app = express();
app.use(express.json());

// --- Session Management ---

interface McpSession {
  transport: SSEServerTransport;
  server: McpServer;
  userId: string;
  apiKeyId: string;
}

const sessions = new Map<string, McpSession>();

const MAX_SESSIONS = 1000;

// --- Rate Limiting ---

const sseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 new SSE connections per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connections, please try again later' },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded, please slow down' },
});

// --- HTTP Endpoints ---

// Health check (public, no auth)
app.get('/mcp/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp',
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint — agents connect here with API key auth
app.get('/mcp/sse', sseLimiter, async (req, res) => {
  // Authenticate via API key
  const auth = await authenticateApiKey(req.headers.authorization ?? '');
  if (!auth) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  // Enforce max session count
  if (sessions.size >= MAX_SESSIONS) {
    res.status(503).json({ error: 'Server at capacity, try again later' });
    return;
  }

  // Create per-session MCP server with all tools registered
  const server = createMcpServer(auth.userId, auth.apiKeyId);
  const transport = new SSEServerTransport('/mcp/messages', res);

  const session: McpSession = {
    transport,
    server,
    userId: auth.userId,
    apiKeyId: auth.apiKeyId,
  };

  sessions.set(transport.sessionId, session);

  res.on('close', () => {
    sessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

// Message endpoint — agents send JSON-RPC messages here
// Requires the same API key that opened the SSE session.
app.post('/mcp/messages', messageLimiter, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Verify the caller owns this session via API key auth
  const auth = await authenticateApiKey(req.headers.authorization ?? '');
  if (!auth || auth.apiKeyId !== session.apiKeyId) {
    res.status(401).json({ error: 'Unauthorized: API key does not match session owner' });
    return;
  }

  await session.transport.handlePostMessage(req, res);
});

// --- Start ---

const PORT = process.env.PORT || 43003;

app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/mcp/health`);
  console.log(`  SSE:      http://localhost:${PORT}/mcp/sse`);
});
