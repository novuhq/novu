/** Which plan limit blocked the request. */
export type WebChatPlanLimitReason = 'agents' | 'channels' | 'conversations';

/**
 * Thrown when a Web Chat request is blocked by a plan limit (HTTP 402).
 * Check `reason` to see which limit was hit.
 */
export class WebChatPlanLimitError extends Error {
  readonly reason: WebChatPlanLimitReason;

  constructor(reason: WebChatPlanLimitReason, message: string) {
    super(message);
    this.name = 'WebChatPlanLimitError';
    this.reason = reason;
  }
}
