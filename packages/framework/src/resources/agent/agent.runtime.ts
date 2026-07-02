import type {
  AgentHandlerContext,
  AgentMessageContext,
  FileRef,
  MessageContent,
  ReplyHandle,
  ToolResult,
} from './agent.types';
import type { ApprovalPayload } from './tool-approval/action-id';

/**
 * One object per turn (`AgentContextImpl`), three typed views:
 *
 * - **Author handlers** — `AgentMessageContext` / `AgentActionContext` / …
 *   Public API only (`reply`, `plan`, `toolApproval`, …).
 * - **Internal adapters** — `AgentRuntimeContext` (this interface).
 *   AI SDK reply-mapper and shared approval helpers; adds `emitToolResult`,
 *   widened `reply({ toolApproval })`, and `asMessageContext()` for resume.
 * - **Dispatch** — `AgentContextImpl` concrete class with lifecycle hooks
 *   (`flush`, `finalizePlan`, …) not exposed through any interface.
 */
export const RUNTIME_CONTEXT_BRAND = Symbol.for('novu.agent.runtimeContext');

/** Context handed to internal agent adapters (e.g. the AI SDK reply mapper). */
export interface AgentRuntimeContext extends AgentHandlerContext {
  readonly [RUNTIME_CONTEXT_BRAND]: true;
  emitToolResult(result: ToolResult): void;
  /** Narrow this context for re-entering `onMessage` after tool approval. */
  asMessageContext(): AgentMessageContext;
  reply(content: MessageContent, options?: { files?: FileRef[]; toolApproval?: ApprovalPayload }): Promise<ReplyHandle>;
}

export function isRuntimeContext(ctx: AgentHandlerContext): ctx is AgentRuntimeContext {
  return (ctx as AgentRuntimeContext)[RUNTIME_CONTEXT_BRAND] === true;
}

export function requireRuntimeContext(ctx: AgentHandlerContext): AgentRuntimeContext {
  if (!isRuntimeContext(ctx)) {
    throw new Error('Agent context must be created by Novu dispatch');
  }

  return ctx;
}
