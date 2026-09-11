import { InvalidActionError } from '../../errors/handler.errors';
import { AgentContextImpl } from './agent.context';
import { toAgentError } from './agent.errors';
import type {
  Agent,
  AgentActionContext,
  AgentBridgeRequest,
  AgentErrorResult,
  AgentHandlerReply,
  AgentHistoryEntry,
  AgentMessageContext,
  AgentReactionContext,
  AgentResolveContext,
  AgentToolCall,
  MessageContent,
  ToolApprovalDecision,
} from './agent.types';
import { AgentEventEnum, isAgentErrorSuppress, isAgentHandlerReply, PendingApproval } from './agent.types';
import { isCardElement } from './guards';
import { parseApprovalActionId, type ToolApprovalRequestPayload } from './tool-approval/action-id';

function isMessageContent(value: unknown): value is MessageContent {
  if (typeof value === 'string') {
    return true;
  }

  if (typeof value === 'object' && value !== null && isCardElement(value)) {
    return true;
  }

  if (typeof value === 'object' && value !== null && ('markdown' in value || 'card' in value || 'files' in value)) {
    return true;
  }

  return false;
}

function ctxForEvent(
  ctx: AgentContextImpl,
  _event: string
): AgentMessageContext | AgentActionContext | AgentReactionContext | AgentResolveContext {
  return ctx as AgentMessageContext | AgentActionContext | AgentReactionContext | AgentResolveContext;
}

const TOOL_APPROVAL_REQUEST_ID_PREFIX = 'tool_approval:';

function parseToolApprovalHumanRequestId(requestId: string | undefined): string | null {
  if (!requestId?.startsWith(TOOL_APPROVAL_REQUEST_ID_PREFIX)) {
    return null;
  }

  const approvalId = requestId.slice(TOOL_APPROVAL_REQUEST_ID_PREFIX.length);

  return approvalId.length > 0 ? approvalId : null;
}

async function dispatchHandlerReply(ctx: AgentContextImpl, result: AgentHandlerReply): Promise<void> {
  await ctx.reply(result.content, { files: result.files, quoteReply: result.quoteReply });
}

async function dispatchReplyResult(
  ctx: AgentContextImpl,
  result: MessageContent | AgentHandlerReply | PendingApproval | void | undefined
): Promise<void> {
  if (result instanceof PendingApproval || result === undefined) {
    return;
  }

  if (isAgentHandlerReply(result)) {
    await dispatchHandlerReply(ctx, result);

    return;
  }

  await ctx.reply(result);
}

async function reportFromOnErrorResult(ctx: AgentContextImpl, result: AgentErrorResult | undefined): Promise<boolean> {
  if (isAgentErrorSuppress(result)) {
    return true;
  }

  if (isAgentHandlerReply(result)) {
    await dispatchHandlerReply(ctx, result);

    return true;
  }

  if (isMessageContent(result)) {
    await ctx.reply(result);

    return true;
  }

  return false;
}

function findApprovalInHistory(
  history: AgentHistoryEntry[],
  approvalId: string
): ToolApprovalRequestPayload | undefined {
  for (const entry of history) {
    const tool = entry.toolData;
    if (entry.type === 'tool_approval_request' && tool?.approvalId === approvalId && tool.toolCallId) {
      return {
        approvalId: tool.approvalId,
        toolCallId: tool.toolCallId,
        name: tool.toolName ?? 'tool',
        input: tool.input,
      };
    }
  }

  return undefined;
}

export interface DispatchAgentEventOptions {
  agent: Agent;
  event: string;
  bridge: AgentBridgeRequest;
  secretKey: string;
  logger?: { error: (...args: unknown[]) => void };
}

export async function dispatchAgentEvent(options: DispatchAgentEventOptions): Promise<void> {
  const ctx = new AgentContextImpl(options.bridge, options.secretKey, options.agent.handlers.toolApproval);
  const { agent, event, logger } = options;

  try {
    ctx.queueRunStart();
    await runAgentHandler(agent, event, ctx);
    await ctx.flush();
    await ctx.emitRunFinish({ outcome: 'completed' });
  } catch (err) {
    const error = toAgentError(err);

    logger?.error(`[agent:${agent.id}] Turn failed (${event}): ${error.message}`, error.cause ?? error);

    let reported = false;

    if (agent.handlers.onError) {
      try {
        const result = await agent.handlers.onError(error, ctxForEvent(ctx, event));
        reported = await reportFromOnErrorResult(ctx, result);
      } catch (onErrorErr) {
        logger?.error(`[agent:${agent.id}] onError failed:`, onErrorErr);
      }
    }

    if (!reported) {
      await ctx.reportTurnError(error.message);
    } else {
      await ctx.emitRunFinish({ outcome: 'completed' });
    }
  } finally {
    // A handler that throws (e.g. a LangGraph GraphRecursionError) never produces a
    // reply, which would otherwise leave the platform's "thinking" indicator running
    // forever. Best-effort clear it and flush any queued signals so the turn visibly ends.
    try {
      await ctx.typing.stop();
      await ctx.flush();
    } catch {
      // cosmetic — never mask the original failure; also swallows secondary delivery errors.
    }
  }
}

async function handleOnActionEvent(registeredAgent: Agent, ctx: AgentContextImpl): Promise<void> {
  const hitlApprovalId = parseToolApprovalHumanRequestId(ctx.humanResponse?.requestId);
  const parsed = parseApprovalActionId(ctx.action?.id);
  const routedApprovalId = hitlApprovalId ?? parsed?.approvalId;
  const routedApproved = hitlApprovalId
    ? ctx.humanResponse?.status === 'approved' && !ctx.humanResponse.expired
    : parsed?.approved;

  if (routedApprovalId && routedApproved !== undefined && registeredAgent.handlers.onToolApproval) {
    const approval = findApprovalInHistory(ctx.history, routedApprovalId);
    const toolCall: AgentToolCall = approval
      ? { id: approval.toolCallId, name: approval.name, input: approval.input }
      : { id: routedApprovalId, name: '' };
    // `ctx.action` is absent when the settlement arrives without a click —
    // a HITL response routed via `humanResponse` (expiry, background/timeout
    // settlement). Optional-chain the source message so those turns resume
    // the gate instead of throwing on a null action.
    const approvalMessage = ctx.createReplyHandle(ctx.action?.sourceMessageId ?? '');

    const decision: ToolApprovalDecision = { toolCall, approved: routedApproved, approvalMessage };

    if (registeredAgent.userOnToolApproval === false) {
      await ctx.typing();

      if (ctx.action?.sourceMessageId) {
        await approvalMessage.delete();
      }
    }

    const result = await registeredAgent.handlers.onToolApproval(decision, ctx as AgentActionContext);
    await dispatchReplyResult(ctx, result);

    return;
  }

  const action = ctx.action;
  if (action && registeredAgent.handlers.onAction) {
    await dispatchReplyResult(ctx, await registeredAgent.handlers.onAction(action, ctx as AgentActionContext));
  }
}

async function runAgentHandler(registeredAgent: Agent, event: string, ctx: AgentContextImpl): Promise<void> {
  switch (event) {
    case AgentEventEnum.ON_MESSAGE: {
      const message = ctx.message;
      if (message) {
        await dispatchReplyResult(ctx, await registeredAgent.handlers.onMessage(message, ctx as AgentMessageContext));
      }
      break;
    }
    case AgentEventEnum.ON_ACTION: {
      await handleOnActionEvent(registeredAgent, ctx);
      break;
    }
    case AgentEventEnum.ON_REACTION: {
      const reaction = ctx.reaction;
      if (reaction && registeredAgent.handlers.onReaction) {
        await dispatchReplyResult(
          ctx,
          await registeredAgent.handlers.onReaction(reaction, ctx as AgentReactionContext)
        );
      }
      break;
    }
    case AgentEventEnum.ON_RESOLVE:
      if (registeredAgent.handlers.onResolve) {
        await dispatchReplyResult(ctx, await registeredAgent.handlers.onResolve(ctx as AgentResolveContext));
      }
      break;
    default:
      throw new InvalidActionError(event, AgentEventEnum);
  }
}
