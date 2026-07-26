import { AIMessage, type BaseMessage, isAIMessage, isBaseMessage } from '@langchain/core/messages';
import { type AgentMiddleware, createAgent } from 'langchain';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { ToolApprovalConfig } from '../../resources/agent/agent.types';
import { isCardElement } from '../../resources/agent/guards';
import { toLangChainMessages } from '../history-mapper';
import {
  createApprovalMiddleware,
  executeApprovedTools,
  findToolApprovalRequired,
  postApprovalCard,
} from '../tool-approval';
import type { LangChainAgentConfig, LangChainInvokeResult, LangChainResult } from '../types';
import { emitExecutedToolResults } from './collect-results';

interface AgentInvokeResult {
  messages: BaseMessage[];
}

// ─── Guards ───────────────────────────────────────────────────────────────────

export function isLangChainConfig(value: unknown): value is LangChainAgentConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const model = (value as LangChainAgentConfig).model;

  return typeof model === 'string' || (typeof model === 'object' && model !== null);
}

export function isLangChainInvokeResult(value: unknown): value is LangChainInvokeResult {
  return typeof value === 'object' && value !== null && Array.isArray((value as LangChainInvokeResult).messages);
}

export function isLangChainResult(value: unknown): value is LangChainResult {
  if (typeof value !== 'object' || value === null || isCardElement(value)) {
    return false;
  }

  return isBaseMessage(value as BaseMessage) || isLangChainConfig(value) || isLangChainInvokeResult(value);
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function textFromContent(content: AIMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((block) => {
      const part = block as { type?: string; text?: unknown };

      return part.type === 'text' && typeof part.text === 'string' ? part.text : '';
    })
    .join('');
}

function finalText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (isAIMessage(message)) {
      return textFromContent(message.content).trim();
    }
  }

  return '';
}

async function deliverText(
  text: string,
  ctx: AgentRuntimeContext,
  formatReply?: LangChainAgentConfig['formatReply']
): Promise<void> {
  if (!text) {
    await ctx.typing.stop();

    return;
  }

  const content = formatReply ? ((await formatReply(text)) ?? text) : text;
  await ctx.reply(content);
}

// ─── Config path (Novu-managed approval loop) ───────────────────────────────────

async function runAgentConfig(
  config: LangChainAgentConfig,
  ctx: AgentRuntimeContext,
  approvalConfig: ToolApprovalConfig | undefined
): Promise<void> {
  const freshResults = await executeApprovedTools(config.tools, ctx);
  const messages = toLangChainMessages(ctx.history, undefined, freshResults);

  const middleware: AgentMiddleware[] = [];
  if (config.needsApproval) {
    middleware.push(createApprovalMiddleware(config.needsApproval));
  }
  if (config.middleware) {
    middleware.push(...config.middleware);
  }

  const agent = createAgent({
    model: config.model,
    tools: config.tools ?? [],
    ...(config.system ? { prompt: config.system } : {}),
    ...(middleware.length > 0 ? { middleware } : {}),
  });

  let result: AgentInvokeResult;
  try {
    result = (await agent.invoke({ messages }, config.invokeConfig)) as AgentInvokeResult;
  } catch (error) {
    const approval = findToolApprovalRequired(error);
    if (approval) {
      await postApprovalCard(ctx, approval, approvalConfig);

      return;
    }

    throw error;
  }

  emitExecutedToolResults(result.messages, ctx, new Set(freshResults.keys()));
  await deliverText(finalText(result.messages), ctx, config.formatReply);
}

// ─── Router ─────────────────────────────────────────────────────────────────────

/** Route a LangChain handler result: run the config (with approval loop) or deliver messages. */
export async function handleLangChainResult(
  result: LangChainResult,
  ctx: AgentRuntimeContext,
  approvalConfig: ToolApprovalConfig | undefined
): Promise<void> {
  if (isLangChainConfig(result)) {
    await runAgentConfig(result, ctx, approvalConfig);

    return;
  }

  if (isBaseMessage(result as BaseMessage)) {
    await deliverText(finalText([result as BaseMessage]), ctx);

    return;
  }

  emitExecutedToolResults((result as LangChainInvokeResult).messages, ctx);
  await deliverText(finalText((result as LangChainInvokeResult).messages), ctx);
}
