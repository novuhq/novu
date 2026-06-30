import type { generateText, streamText } from 'ai';
import type {
  AgentActionContext,
  AgentHandlers,
  AgentMessage,
  AgentMessageContext,
  MessageContent,
  ToolApprovalConfig,
  ToolApprovalDecision,
} from '../resources/agent/agent.types';
import type { Awaitable } from '../types/util.types';

/** Result from `streamText()` or `generateText()`. Return from `onMessage` to reply with the model output. */
export type AiSdkResult = ReturnType<typeof streamText> | Awaited<ReturnType<typeof generateText>>;

/**
 * Event handlers for an AI SDK agent.
 *
 * Same shape as `AgentHandlers`, except `onMessage` may also return a
 * `streamText()` or `generateText()` result — Novu delivers the model output
 * automatically.
 */
export type AiSdkAgentHandlers = Omit<AgentHandlers, 'onMessage' | 'onToolApproval'> & {
  onMessage: (message: AgentMessage, ctx: AgentMessageContext) => Awaitable<MessageContent | AiSdkResult | void>;
  /**
   * Optional. The adapter auto-resumes by default; define this to add side-effects
   * (return `void`) or to drive the resume yourself (return a `streamText`/`generateText` result).
   */
  onToolApproval?: (decision: ToolApprovalDecision, ctx: AgentActionContext) => Awaitable<AiSdkResult | void>;
  toolApproval?: ToolApprovalConfig;
};
