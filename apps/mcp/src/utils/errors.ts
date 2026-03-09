/** Standard MCP error codes for tool responses */
export type ErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'RATE_LIMITED' | 'INTERNAL';

/**
 * Format a tool error response in the standard MCP format.
 * All tool errors should use this helper to ensure consistent shape.
 */
export function toolError(code: ErrorCode, message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: { code, message } }),
      },
    ],
    isError: true,
  };
}

/**
 * Format a successful tool response.
 * Wraps JSON data in the MCP text content format.
 */
export function toolResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data),
      },
    ],
  };
}

/**
 * Custom error class for permission/access violations.
 * Thrown by permission helpers and caught by tool handlers.
 */
export class McpToolError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}
