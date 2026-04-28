/**
 * Thrown by `ctx.reply()` and `handle.edit()` when the upstream message delivery
 * fails — e.g. the configured email provider returns 401, Slack rejects the token,
 * or Teams rejects the request.
 *
 * The `message` property contains the original provider error text
 *
 * @example
 * ```ts
 * import { AgentDeliveryError } from '@novu/framework';
 *
 * try {
 *   await ctx.reply('Hello!');
 * } catch (err) {
 *   if (err instanceof AgentDeliveryError) {
 *     // Delivery failed (misconfigured provider, rate limit, etc.)
 *     console.error('Delivery failed:', err.message);
 *     return;
 *   }
 *   throw err;
 * }
 * ```
 */
export class AgentDeliveryError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AgentDeliveryError';
    this.statusCode = statusCode;
  }
}
