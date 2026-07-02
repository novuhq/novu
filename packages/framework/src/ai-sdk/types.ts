import type {
  AgentActionContext,
  AgentHandlers,
  AgentMessage,
  AgentMessageContext,
  MessageContent,
  ToolApprovalDecision,
} from '../resources/agent/agent.types';
import type { Awaitable } from '../types/util.types';

/** The fields Novu reads from a `streamText()` / `generateText()` result. */
export type AiSdkResult = {
  text: string | PromiseLike<string>;
  textStream?: AsyncIterable<string>;
  content?: unknown;
  steps?: unknown;
  response?: PromiseLike<{ messages?: Array<{ role: string; content?: unknown }> }>;
};

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
  ) => Awaitable<MessageContent | AiSdkResult | void>;
};
