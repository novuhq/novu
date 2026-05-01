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

/**
 * Thrown by `ctx.reply()` and `handle.edit()` when the upstream message delivery
 * fails — e.g. the configured email provider returns 401, Slack rejects the token,
 * or Teams rejects the request.
 *
 * `message` is always a short, human-readable summary.
 * `responseBody` preserves the raw upstream body for debugging.
 *
 * @example
 * ```ts
 * import { AgentDeliveryError } from '@novu/framework';
 *
 * try {
 *   await ctx.reply('Hello!');
 * } catch (err) {
 *   if (err instanceof AgentDeliveryError) {
 *     console.error('Delivery failed:', err.message);
 *     return;
 *   }
 *   throw err;
 * }
 * ```
 */
export class AgentDeliveryError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(statusCode: number, responseBody: string) {
    const reason = HTTP_STATUS_TEXT[statusCode] ?? statusCode;
    super(`Delivery failed: ${reason}`);
    this.name = 'AgentDeliveryError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
