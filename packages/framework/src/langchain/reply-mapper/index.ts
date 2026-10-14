import { AIMessage, type BaseMessage, isAIMessage, isBaseMessage } from '@langchain/core/messages';
import { type AgentMiddleware, createAgent } from 'langchain';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { ReplyStream, ToolApprovalConfig } from '../../resources/agent/agent.types';
import { isCardElement } from '../../resources/agent/guards';
import { toLangChainMessages } from '../history-mapper';
import { hydrateUnreachableAttachmentUrls } from '../history-mapper/hydrate-attachment-urls';
import {
  createApprovalMiddleware,
  executeApprovedTools,
  findToolApprovalRequired,
  type NovuToolApprovalRequired,
  postApprovalCard,
} from '../tool-approval';
import type { LangChainAgentConfig, LangChainInvokeResult, LangChainResult } from '../types';
import { emitExecutedToolResults } from './collect-results';

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

/** Node `createAgent` runs model calls in; other nodes (e.g. middleware) may call models too. */
const MODEL_NODE = 'model_request';

function modelChunkText(message: BaseMessage, metadata: Record<string, unknown> | undefined): string {
  if (metadata?.langgraph_node !== MODEL_NODE || !isAIMessage(message)) return '';

  return textFromContent(message.content);
}

/**
 * Replies with the model's text, model calls separated as paragraphs: as it streams, or whole once
 * `formatReply` formatted it. A gated tool ends the run: the text before it is kept, then the
 * approval card is posted.
 */
async function replyAgentText(
  agent: ReturnType<typeof createAgent>,
  messages: BaseMessage[],
  config: LangChainAgentConfig,
  ctx: AgentRuntimeContext,
  approvalConfig: ToolApprovalConfig | undefined,
  executed: Set<string>
): Promise<void> {
  const outcome: { approval?: NovuToolApprovalRequired } = {};

  async function* modelText(): ReplyStream {
    let finalMessages: BaseMessage[] = [];
    let lastMessageId: string | undefined;
    let wroteText = false;

    try {
      const stream = await agent.stream(
        { messages },
        { ...config.invokeConfig, streamMode: ['messages', 'values'] as const }
      );

      for await (const [mode, chunk] of stream) {
        if (mode === 'values') {
          finalMessages = chunk.messages;
          continue;
        }

        const [message, metadata] = chunk;
        const text = modelChunkText(message, metadata);
        if (!text) continue;
        if (wroteText && message.id !== lastMessageId) yield '\n\n';
        lastMessageId = message.id;
        wroteText = true;
        yield text;
      }
    } catch (error) {
      outcome.approval = findToolApprovalRequired(error);
      if (!outcome.approval) throw error;

      return;
    }

    // Queued before the reply is sent, so the results are recorded ahead of it.
    emitExecutedToolResults(finalMessages, ctx, executed);
  }

  if (config.formatReply) {
    let text = '';
    for await (const delta of modelText()) {
      text += delta;
    }
    await deliverText(text.trim(), ctx, config.formatReply);
  } else {
    await ctx.reply(modelText());
  }

  if (outcome.approval) {
    await postApprovalCard(ctx, outcome.approval, approvalConfig);
  }
}

async function runAgentConfig(
  config: LangChainAgentConfig,
  ctx: AgentRuntimeContext,
  approvalConfig: ToolApprovalConfig | undefined
): Promise<void> {
  const freshResults = await executeApprovedTools(config.tools, ctx);
  const messages = await hydrateUnreachableAttachmentUrls(toLangChainMessages(ctx, undefined, freshResults));

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

  await replyAgentText(agent, messages, config, ctx, approvalConfig, new Set(freshResults.keys()));
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
