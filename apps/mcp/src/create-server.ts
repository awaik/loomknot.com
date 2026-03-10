import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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

  // Intercept the internal setRequestHandler to wrap the CallTool handler with logging
  instrumentToolLogging(server, userId);

  registerBootstrapTools(server, userId, apiKeyId);
  registerProjectTools(server, userId, apiKeyId);
  registerMemoryTools(server, userId, apiKeyId);
  registerPageTools(server, userId, apiKeyId);
  registerTaskTools(server, userId, apiKeyId);
  registerNegotiationTools(server, userId, apiKeyId);
  registerActivityTools(server, userId, apiKeyId);

  return server;
}

/**
 * Intercept setRequestHandler on the underlying Server to wrap the
 * CallToolRequest handler with timing logs.
 *
 * NOTE: This monkey-patches Server.setRequestHandler before McpServer.tool()
 * registers the CallTool handler. Tested with @modelcontextprotocol/sdk 1.x.
 * If the SDK changes setRequestHandler signature, this will need updating.
 */
function instrumentToolLogging(server: McpServer, userId: string): void {
  const userTag = userId.slice(0, 12);
  const lowServer = server.server;

  const originalSetHandler = lowServer.setRequestHandler.bind(lowServer);

  lowServer.setRequestHandler = function patchedSetRequestHandler(
    schema: { shape: { method: { value: string } } },
    handler: (request: unknown, extra: unknown) => Promise<unknown>,
  ) {
    if (schema.shape.method.value === CallToolRequestSchema.shape.method.value) {
      const wrappedHandler = async (request: unknown, extra: unknown) => {
        const toolName = (request as { params: { name: string } }).params.name;
        const start = performance.now();
        console.log(`[MCP] → ${toolName} user=${userTag}…`);
        try {
          const result = await handler(request, extra);
          const ms = (performance.now() - start).toFixed(0);
          console.log(`[MCP] ← ${toolName} ${ms}ms`);
          return result;
        } catch (err) {
          const ms = (performance.now() - start).toFixed(0);
          console.error(`[MCP] ✗ ${toolName} ${ms}ms`, err);
          throw err;
        }
      };
      return originalSetHandler(schema as never, wrappedHandler as never);
    }
    return originalSetHandler(schema as never, handler as never);
  } as typeof lowServer.setRequestHandler;
}
