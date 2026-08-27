export type WebChatPlanLimitReason = 'agents' | 'channels' | 'conversations';

export class WebChatPlanLimitError extends Error {
  readonly reason: WebChatPlanLimitReason;

  constructor(reason: WebChatPlanLimitReason, message: string) {
    super(message);
    this.name = 'WebChatPlanLimitError';
    this.reason = reason;
  }
}
