import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBootstrapTools } from '@/tools/bootstrap';
import { registerProjectTools } from '@/tools/projects';
import { registerMemoryTools } from '@/tools/memory';
import { registerPageTools } from '@/tools/pages';
import { registerTaskTools } from '@/tools/tasks';
import { registerNegotiationTools } from '@/tools/negotiations';
import { registerActivityTools } from '@/tools/activity';

/**
 * Create a fully configured MCP server instance with all 24 tools registered.
 * Each SSE session gets its own server instance, scoped to the authenticated user.
 */
export function createMcpServer(userId: string, apiKeyId: string): McpServer {
  const server = new McpServer({
    name: 'loomknot',
    version: '0.1.0',
  });

  registerBootstrapTools(server, userId, apiKeyId);
  registerProjectTools(server, userId, apiKeyId);
  registerMemoryTools(server, userId, apiKeyId);
  registerPageTools(server, userId, apiKeyId);
  registerTaskTools(server, userId, apiKeyId);
  registerNegotiationTools(server, userId, apiKeyId);
  registerActivityTools(server, userId, apiKeyId);

  return server;
}
