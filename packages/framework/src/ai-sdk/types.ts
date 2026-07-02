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

/** The fields Novu reads from a `streamText()` / `generateText()` result. */
export type AiSdkResult = {
  text: string | PromiseLike<string>;
  textStream?: AsyncIterable<string>;
  content?: unknown;
  steps?: unknown;
  response?: PromiseLike<{ messages?: Array<{ role: string; content?: unknown }> }>;
};

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
   * (return `void`), post a reply (return `MessageContent`), or drive the resume yourself
   * (return a `streamText`/`generateText` result).
   */
  onToolApproval?: (
    decision: ToolApprovalDecision,
    ctx: AgentActionContext
  ) => Awaitable<MessageContent | AiSdkResult | void>;
  toolApproval?: ToolApprovalConfig;
};
