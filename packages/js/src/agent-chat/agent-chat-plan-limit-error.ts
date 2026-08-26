export type AgentChatPlanLimitReason = 'agents' | 'channels' | 'conversations';

export class AgentChatPlanLimitError extends Error {
  readonly reason: AgentChatPlanLimitReason;

  constructor(reason: AgentChatPlanLimitReason, message: string) {
    super(message);
    this.name = 'AgentChatPlanLimitError';
    this.reason = reason;
  }
}
