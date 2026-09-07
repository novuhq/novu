import type {
  AgentHandlerContext,
  AgentMessageContext,
  ReplyHandle,
  ToolApprovalCard,
  ToolResult,
} from './agent.types';
import type { ToolApprovalRequestPayload } from './tool-approval/action-id';

export const RUNTIME_CONTEXT_BRAND = Symbol.for('novu.agent.runtimeContext');

export interface AgentRuntimeContext extends AgentHandlerContext {
  readonly [RUNTIME_CONTEXT_BRAND]: true;
  emitToolResult(result: ToolResult): void;
  emitToolApprovalRequest(request: ToolApprovalRequestPayload): void;
  replyApprovalCard(card: ToolApprovalCard): Promise<ReplyHandle>;
  asMessageContext(): AgentMessageContext;
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
