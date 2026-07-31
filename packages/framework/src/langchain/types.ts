import type { LanguageModelLike } from '@langchain/core/language_models/base';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { AgentMiddleware } from 'langchain';
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

/** A tool call surfaced to `needsApproval` before it executes. */
export interface LangChainToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Declarative agent config the adapter runs on your behalf.
 *
 * Returning this from `onMessage` lets Novu own the tool-approval loop: gated
 * tools pause the turn with an approval card and resume statelessly from
 * `ctx.history` — no LangGraph checkpointer required.
 */
export interface LangChainAgentConfig {
  /**
   * Chat model instance or `"provider:model"` identifier passed to `createAgent`.
   * On Next.js, model strings require LangChain packages in `serverExternalPackages`
   * (scaffolded by `novu connect --runtime langchain`).
   */
  model: string | LanguageModelLike;
  /** Tools available to the agent. */
  tools?: StructuredToolInterface[];
  /** System prompt for the agent (forwarded to `createAgent` as `prompt`). */
  system?: string;
  /** Return `true` to gate a tool call behind a Novu approval card before it runs. */
  needsApproval?: (toolCall: LangChainToolCall) => boolean;
  /** Extra LangChain middleware, appended after Novu's approval middleware. */
  middleware?: AgentMiddleware[];
  /**
   * Run config forwarded as the second argument to `agent.invoke(...)` (e.g.
   * `signal`, `configurable`, `context`, `recursionLimit`, `callbacks`). Use this
   * to control the LangGraph run for a turn.
   */
  invokeConfig?: RunnableConfig;
  /**
   * Optional post-run reply formatter. Receives the model's final text and returns
   * the content to deliver — a string or a {@link MessageContent} card. Return
   * `void`/`undefined` to deliver the final text unchanged. Runs only when the
   * model produced a non-empty final text.
   */
  formatReply?: (finalText: string) => Awaitable<MessageContent | void>;
}

/**
 * Result of a LangChain agent/graph you invoked yourself (e.g. `await agent.invoke(...)`).
 * Delivered as-is — tool approval is not managed by Novu on this path.
 */
export interface LangChainInvokeResult {
  messages: BaseMessage[];
}

/** Anything a `@novu/framework/langchain` handler may return for automatic delivery. */
export type LangChainResult = LangChainAgentConfig | LangChainInvokeResult | BaseMessage;

/**
 * Handlers for `@novu/framework/langchain` agents.
 *
 * Extends {@link AgentHandlers}: same events and config (`toolApproval`, etc.),
 * but `onMessage` and `onToolApproval` may return a {@link LangChainResult} for
 * automatic delivery.
 */
export type LangChainAgentHandlers = Omit<AgentHandlers, 'onMessage' | 'onToolApproval'> & {
  onMessage: (message: AgentMessage, ctx: AgentMessageContext) => Awaitable<MessageContent | LangChainResult | void>;
  /**
   * Optional. Auto-resumes `onMessage` after approve/deny unless you return a
   * `LangChainResult` to drive the resume yourself.
   */
  onToolApproval?: (
    decision: ToolApprovalDecision,
    ctx: AgentActionContext
  ) => Awaitable<MessageContent | LangChainResult | ReplyHandle | void>;
  onError?: AgentHandlers['onError'];
};
