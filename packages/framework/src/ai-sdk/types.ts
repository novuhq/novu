import type { generateText, streamText } from 'ai';
import type {
  AgentActionContext,
  AgentHandlers,
  AgentMessage,
  AgentMessageContext,
  MessageContent,
  ReplyHandle,
  ToolApprovalDecision,
} from '../resources/agent/agent.types';
import type { Awaitable } from '../types/util.types';

export type AiSdkStreamResult = Awaited<ReturnType<typeof streamText>>;
export type AiSdkGenerateResult = Awaited<ReturnType<typeof generateText>>;
export type AiSdkResult = AiSdkStreamResult | AiSdkGenerateResult;

/** Pause marker in `result.content` — the SDK's `ToolApprovalRequestOutput`, not assistant-message `ToolApprovalRequest`. */
export type AiSdkApprovalRequestPart = Extract<
  AiSdkGenerateResult['content'][number],
  { type: 'tool-approval-request' }
>;

/**
 * Handlers for `@novu/framework/ai-sdk` agents.
 *
 * Extends {@link AgentHandlers}: same events and config (`toolApproval`, etc.),
 * but `onMessage` and `onToolApproval` may return an AI SDK result for automatic delivery.
 */
export type AiSdkAgentHandlers = Omit<AgentHandlers, 'onMessage' | 'onToolApproval'> & {
  onMessage: (message: AgentMessage, ctx: AgentMessageContext) => Awaitable<MessageContent | AiSdkResult | void>;
  /**
   * Optional. Auto-resumes `onMessage` after approve/deny unless you return an
   * `AiSdkResult` to drive the resume yourself.
   */
  onToolApproval?: (
    decision: ToolApprovalDecision,
    ctx: AgentActionContext
  ) => Awaitable<MessageContent | AiSdkResult | ReplyHandle | void>;
};
