import { IJobParams } from '../services/queues/queue-base.service';

/**
 * Approval (or denial) of a single tool call surfaced earlier as an
 * Approve/Deny card. Mutually exclusive with `messageText`: when this is
 * set the worker resumes the existing managed-agent session by sending a
 * `user.tool_confirmation` event instead of a new user message.
 */
export interface IManagedAgentToolConfirmation {
  toolUseId: string;
  approved: boolean;
  /** Optional context the user typed alongside the deny click. */
  denyMessage?: string;
}

export interface IManagedAgentJobData {
  agentId: string;
  conversationId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  agentIdentifier: string;
  platform: string;
  /**
   * The inbound message text. Required for normal user turns; left as the
   * empty string when `toolConfirmation` is set (the worker resumes the
   * session via a `user.tool_confirmation` event rather than a new message).
   */
  messageText: string;
  subscriberId?: string;
  subscriberFirstName?: string;
  /** Platform thread ID for HandleAgentReply delivery */
  platformThreadId: string;
  /**
   * When present, the worker resumes the conversation's existing managed
   * runtime session by approving or denying the referenced tool call instead
   * of sending a new user message.
   */
  toolConfirmation?: IManagedAgentToolConfirmation;
}

export interface IManagedAgentJobDto extends IJobParams {
  data: IManagedAgentJobData;
}
