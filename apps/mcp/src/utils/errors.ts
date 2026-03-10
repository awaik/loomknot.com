/** Standard MCP error codes for tool responses */
export type ErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

interface ToolErrorOptions {
  hint?: string;
  retryable?: boolean;
}

/** Default AI-friendly hints per error code */
const DEFAULT_HINTS: Record<ErrorCode, string> = {
  NOT_FOUND: 'Verify the ID is correct and the resource has not been deleted.',
  FORBIDDEN: 'You lack permission for this action. Check your project role.',
  VALIDATION: 'Check that input values match expected format and constraints.',
  CONFLICT: 'A resource with these values already exists, or it was modified concurrently.',
  RATE_LIMITED: 'Too many requests. Wait before retrying.',
  INTERNAL: 'Unexpected server error. Retry, or simplify the request if it fails again.',
};

/**
 * Format a tool error response with AI-friendly structured metadata.
 *
 * Every error includes:
 * - `code`      — machine-readable error category
 * - `message`   — what happened
 * - `hint`      — actionable advice for the AI agent
 * - `retryable` — whether retrying the same request might succeed
 */
export function toolError(code: ErrorCode, message: string, options?: ToolErrorOptions) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: {
            code,
            message,
            hint: options?.hint ?? DEFAULT_HINTS[code],
            retryable: options?.retryable ?? (code === 'INTERNAL' || code === 'RATE_LIMITED'),
          },
        }),
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
 * Custom error class for business-logic violations (permissions, access).
 * Thrown by permission helpers, caught automatically by classifyError.
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

// --- Error classification engine ---

/** Detect PostgreSQL errors from postgres.js / Drizzle */
function isPostgresError(
  err: unknown,
): err is { code: string; message: string; detail?: string; constraint?: string } {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string' &&
    ((err as Record<string, unknown>).code as string).length === 5
  );
}

/** Map PostgreSQL error codes to AI-friendly responses */
function classifyPostgresError(err: {
  code: string;
  message: string;
  detail?: string;
}): { code: ErrorCode; message: string; hint: string; retryable: boolean } {
  switch (err.code) {
    case '23505': // unique_violation
      return {
        code: 'CONFLICT',
        message: `Duplicate entry${err.detail ? `: ${err.detail}` : ''}`,
        hint: 'A record with these values already exists. Use a different value or update the existing record.',
        retryable: false,
      };
    case '23503': // foreign_key_violation
      return {
        code: 'VALIDATION',
        message: `Referenced record not found${err.detail ? `: ${err.detail}` : ''}`,
        hint: 'The ID you referenced does not exist. Verify it is correct and the target has not been deleted.',
        retryable: false,
      };
    case '23502': // not_null_violation
      return {
        code: 'VALIDATION',
        message: `Required field is missing${err.detail ? `: ${err.detail}` : ''}`,
        hint: 'A required field was not provided. Check the tool schema for mandatory parameters.',
        retryable: false,
      };
    case '22001': // string_data_right_truncation
      return {
        code: 'VALIDATION',
        message: 'Text value exceeds the maximum allowed length',
        hint: 'Shorten the text. Limits: title 500 chars, description 2000 chars, block type 50 chars.',
        retryable: false,
      };
    case '22P02': // invalid_text_representation
      return {
        code: 'VALIDATION',
        message: `Invalid data format: ${err.message}`,
        hint: 'Ensure all values match expected types (strings, numbers, valid JSON objects).',
        retryable: false,
      };
    case '53300': // too_many_connections
    case '53400': // configuration_limit_exceeded
      return {
        code: 'INTERNAL',
        message: 'Server is temporarily overloaded',
        hint: 'Wait a few seconds and retry.',
        retryable: true,
      };
    case '57014': // query_canceled (statement_timeout)
      return {
        code: 'INTERNAL',
        message: 'Database query timed out',
        hint: 'The operation took too long. Retry with less data or fewer blocks.',
        retryable: true,
      };
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return {
        code: 'INTERNAL',
        message: 'Concurrent modification conflict',
        hint: 'Another operation modified the same data simultaneously. Retry.',
        retryable: true,
      };
    default:
      return {
        code: 'INTERNAL',
        message: `Database error (${err.code}): ${err.message}`,
        hint: 'Unexpected database error. Simplify your request or retry.',
        retryable: true,
      };
  }
}

/**
 * Classify any thrown error into a structured, AI-friendly tool error.
 *
 * Recognises:
 * - McpToolError  → business-logic (permissions, not-found)
 * - PostgreSQL    → constraint violations, timeouts, deadlocks
 * - Network       → connection refused/reset, timeouts
 * - Generic Error → message extraction with retry guidance
 *
 * Logs full details server-side; returns a concise,
 * actionable summary to the AI agent.
 */
export function classifyError(err: unknown, toolName: string) {
  if (err instanceof McpToolError) {
    return toolError(err.code, err.message);
  }

  if (isPostgresError(err)) {
    const pg = classifyPostgresError(err);
    console.error(`[${toolName}] pg:${err.code}`, err.message, err.detail ?? '');
    return toolError(pg.code, pg.message, { hint: pg.hint, retryable: pg.retryable });
  }

  if (err instanceof Error) {
    console.error(`[${toolName}]`, err.message);

    if (err.message.includes('too large') || err.message.includes('PayloadTooLarge')) {
      return toolError('VALIDATION', 'Request payload is too large', {
        hint: 'Reduce data size. Split large content across multiple calls (e.g. create page first, then add blocks one-by-one).',
        retryable: false,
      });
    }

    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      return toolError('INTERNAL', 'Operation timed out', {
        hint: 'Server is slow. Wait a moment, then retry with less data.',
        retryable: true,
      });
    }

    if (err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET')) {
      return toolError('INTERNAL', 'Service temporarily unavailable', {
        hint: 'Infrastructure issue. Retry after a brief pause.',
        retryable: true,
      });
    }

    return toolError('INTERNAL', `${toolName} failed`, {
      hint: 'Unexpected error. Retry, or simplify the request if it keeps failing.',
      retryable: true,
    });
  }

  console.error(`[${toolName}] unknown:`, err);
  return toolError('INTERNAL', `${toolName} failed unexpectedly`, {
    hint: 'Retry the operation. If it fails again, try with simpler data.',
    retryable: true,
  });
}
