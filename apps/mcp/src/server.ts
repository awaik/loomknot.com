import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const app = express();
app.use(express.json());

// --- MCP Server ---
const mcpServer = new McpServer({
  name: 'loomknot',
  version: '0.1.0',
});

// Test tool — ping
mcpServer.tool('ping', 'Check if the MCP server is alive', {}, async () => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        pong: true,
        timestamp: new Date().toISOString(),
      }),
    },
  ],
}));

// --- HTTP Endpoints ---

// Health check
app.get('/mcp/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp',
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint — agents connect here
const sessions = new Map<string, SSEServerTransport>();

app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/messages', res);
  sessions.set(transport.sessionId, transport);

  res.on('close', () => {
    sessions.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Message endpoint — agents send messages here
app.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessions.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// --- Start ---
const PORT = process.env.PORT || 43003;

app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/mcp/health`);
  console.log(`  SSE:      http://localhost:${PORT}/mcp/sse`);
});
