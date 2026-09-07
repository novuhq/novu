import { type BaseMessage, isBaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { type AgentMiddleware, createMiddleware } from 'langchain';
import type { AgentRuntimeContext } from '../resources/agent/agent.runtime';
import type { AgentToolCall, ToolApprovalConfig } from '../resources/agent/agent.types';
import { postToolApprovalCard } from '../resources/agent/tool-approval/post-card';
import {
  type ApprovedToolCall,
  findApprovedUnexecuted,
  type ToolResultPayload,
} from './history-mapper/approval-cycles';
import type { LangChainToolCall } from './types';

/**
 * Thrown from the approval middleware when a gated tool is about to run. It propagates out
 * of `agent.invoke()` so the adapter can post a Novu approval card and end the turn instead
 * of executing the tool. The approval decision is later replayed from `ctx.history`.
 */
export class NovuToolApprovalRequired extends Error {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly input?: Record<string, unknown>;

  constructor(toolCall: { toolCallId: string; toolName: string; input?: Record<string, unknown> }) {
    super(`Tool "${toolCall.toolName}" requires approval`);
    this.name = 'NovuToolApprovalRequired';
    this.toolCallId = toolCall.toolCallId;
    this.toolName = toolCall.toolName;
    this.input = toolCall.input;
  }
}

const MAX_CAUSE_DEPTH = 10;

/**
 * Find a {@link NovuToolApprovalRequired} in an error or its `cause` chain.
 *
 * LangChain wraps errors thrown from middleware in a `MiddlewareError` (copying the original
 * `name`/`message` and nesting the original under `cause`), and LangGraph may re-wrap again for
 * subgraphs. We therefore walk the `cause` chain rather than relying on a single `instanceof`.
 */
export function findToolApprovalRequired(error: unknown): NovuToolApprovalRequired | undefined {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth += 1) {
    if (current instanceof NovuToolApprovalRequired) {
      return current;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return undefined;
}

export function isToolApprovalRequired(error: unknown): error is NovuToolApprovalRequired {
  return findToolApprovalRequired(error) !== undefined;
}

/**
 * Middleware that gates approval-required tools. When `needsApproval` returns true for a tool
 * call, it throws {@link NovuToolApprovalRequired} before the tool executes.
 */
export function createApprovalMiddleware(needsApproval: (toolCall: LangChainToolCall) => boolean): AgentMiddleware {
  return createMiddleware({
    name: 'novu-tool-approval',
    wrapToolCall: async (request, handler) => {
      const { id, name, args } = request.toolCall;
      const input = (args ?? {}) as Record<string, unknown>;

      if (needsApproval({ id, name, args: input })) {
        throw new NovuToolApprovalRequired({ toolCallId: id ?? name, toolName: name, input });
      }

      return handler(request);
    },
  }) as unknown as AgentMiddleware;
}

/** Post the Novu approval card for a paused gated tool call. */
export async function postApprovalCard(
  ctx: AgentRuntimeContext,
  request: NovuToolApprovalRequired,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  const toolCall: AgentToolCall = { id: request.toolCallId, name: request.toolName, input: request.input };
  await postToolApprovalCard(ctx, toolCall, config);
}

function unwrapToolOutput(output: unknown): unknown {
  if (isBaseMessage(output as BaseMessage)) {
    return (output as BaseMessage).content;
  }

  return output;
}

function toolMapByName(tools: StructuredToolInterface[] | undefined): Map<string, StructuredToolInterface> {
  const map = new Map<string, StructuredToolInterface>();
  for (const tool of tools ?? []) {
    map.set(tool.name, tool);
  }

  return map;
}

/**
 * Execute gated tool calls that the user approved but that have not run yet, record each
 * outcome in the ledger, and return the outputs keyed by `toolCallId` so the history mapper
 * can replay them as resolved call+result pairs on the resume turn.
 */
export async function executeApprovedTools(
  tools: StructuredToolInterface[] | undefined,
  ctx: AgentRuntimeContext
): Promise<Map<string, ToolResultPayload>> {
  const approved = findApprovedUnexecuted(ctx.history);
  const results = new Map<string, ToolResultPayload>();
  if (approved.length === 0) {
    return results;
  }

  const byName = toolMapByName(tools);

  for (const call of approved) {
    const tool = byName.get(call.toolName);
    if (!tool) {
      continue;
    }

    const output = unwrapToolOutput(await tool.invoke((call.input ?? {}) as never));
    results.set(call.toolCallId, { toolCallId: call.toolCallId, toolName: call.toolName, output });
    ctx.emitToolResult({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      output,
      preview: `Tool "${call.toolName}" result`,
    });
  }

  return results;
}

export type { ApprovedToolCall };
