import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBootstrapTools } from '@/tools/bootstrap.js';
import { registerProjectTools } from '@/tools/projects.js';
import { registerMemoryTools } from '@/tools/memory.js';
import { registerPageTools } from '@/tools/pages.js';
import { registerTaskTools } from '@/tools/tasks.js';
import { registerNegotiationTools } from '@/tools/negotiations.js';
import { registerActivityTools } from '@/tools/activity.js';

/**
 * Create a fully configured MCP server instance with all tools registered.
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
