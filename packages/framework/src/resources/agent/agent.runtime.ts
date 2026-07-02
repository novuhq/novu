import type {
  AgentHandlerContext,
  AgentMessageContext,
  FileRef,
  MessageContent,
  ReplyHandle,
  ToolResult,
} from './agent.types';
import type { ApprovalPayload } from './tool-approval/action-id';

export const RUNTIME_CONTEXT_BRAND = Symbol.for('novu.agent.runtimeContext');

export interface AgentRuntimeContext extends AgentHandlerContext {
  readonly [RUNTIME_CONTEXT_BRAND]: true;
  emitToolResult(result: ToolResult): void;
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
