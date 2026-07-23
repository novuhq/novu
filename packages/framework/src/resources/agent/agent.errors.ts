const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

function extractMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  return extractMessage(record.message);
}

function extractResponseDetail(responseBody: string): string | null {
  if (!responseBody) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const message = extractMessage(record.message);
  if (message) {
    return message;
  }

  const error = extractMessage(record.error);
  if (error) {
    return error;
  }

  const errors = record.errors;
  if (Array.isArray(errors)) {
    return extractMessage(errors[0]);
  }

  return null;
}

function formatDeliveryMessage(statusCode: number, responseBody: string): string {
  const reason = HTTP_STATUS_TEXT[statusCode] ?? statusCode;
  const detail = extractResponseDetail(responseBody);

  if (detail) {
    return `Delivery failed: ${reason}: ${detail}`;
  }

  return `Delivery failed: ${reason}`;
}

export type AgentErrorDelivery = {
  statusCode: number;
  responseBody: string;
};

export type AgentErrorOptions = {
  cause?: unknown;
  delivery?: AgentErrorDelivery;
};

/** Turn and handler failures. Delivery failures use {@link AgentDeliveryError}. */
export class AgentError extends Error {
  readonly cause?: unknown;
  readonly delivery?: AgentErrorDelivery;

  constructor(message: string, options?: AgentErrorOptions) {
    super(message);
    this.name = 'AgentError';
    this.cause = options?.cause;
    this.delivery = options?.delivery;
  }
}

/**
 * Thrown by `ctx.reply()` and `handle.edit()` when the upstream message delivery
 * fails — e.g. the configured email provider returns 401, Slack rejects the token,
 * or Teams rejects the request.
 *
 * @example
 * ```ts
 * import { AgentDeliveryError } from '@novu/framework';
 *
 * try {
 *   await ctx.reply('Hello!');
 * } catch (err) {
 *   if (err instanceof AgentDeliveryError) {
 *     console.error('Delivery failed:', err.message, err.statusCode);
 *     return;
 *   }
 *   throw err;
 * }
 * ```
 */
export class AgentDeliveryError extends AgentError {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(statusCode: number, responseBody: string) {
    const delivery = { statusCode, responseBody };
    super(formatDeliveryMessage(statusCode, responseBody), { delivery });
    this.name = 'AgentDeliveryError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown when the ingest endpoint's ack response for an emitted batch is missing, malformed,
 * or reports an unrecognized per-envelope status. Distinct from {@link AgentDeliveryError}
 * because the HTTP request itself succeeded — the contract violation is in the response body,
 * not the status code, so there is no real `statusCode` to report.
 */
export class AgentAckError extends AgentError {
  readonly responseBody: string;

  constructor(responseBody: string) {
    super(`Delivery ack malformed: ${responseBody || '<empty body>'}`);
    this.name = 'AgentAckError';
    this.responseBody = responseBody;
  }
}

export function toAgentError(err: unknown): AgentError {
  if (err instanceof AgentError) {
    return err;
  }

  if (err instanceof Error) {
    return new AgentError(err.message, { cause: err });
  }

  return new AgentError('Turn failed', { cause: err });
}
