import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { AgentHistoryEntry } from '@novu/framework';
import { agent } from '@novu/framework/langchain';

const SYSTEM_PROMPT = [
  'You are a playground agent used to verify that inbound files reach the model.',
  'When the user sends an image (jpeg, png, gif, webp), describe exactly what you see.',
  'When they send a PDF, summarize the document.',
  'If a file was attached but you cannot see it, say so explicitly — do not guess or invent contents.',
  'Keep replies short.',
].join(' ');

function resolveModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({ model: 'claude-haiku-4-5', apiKey: process.env.ANTHROPIC_API_KEY });
  }

  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY });
  }

  return undefined;
}

function formatHistoryAttachments(history: AgentHistoryEntry[]): string {
  const lines: string[] = [];

  for (const entry of history) {
    const raw = entry.richContent?.attachments;
    if (!Array.isArray(raw)) {
      continue;
    }

    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const att = item as Record<string, unknown>;
      const name = typeof att.name === 'string' ? att.name : 'unnamed';
      const mimeType = typeof att.mimeType === 'string' ? att.mimeType : 'unknown';
      const url = typeof att.url === 'string' ? att.url : 'no-url';
      lines.push(`- ${name} (${mimeType}) ${url}`);
    }
  }

  return lines.join('\n');
}

/**
 * LangChain custom-code agent for verifying Slack/Teams image + PDF attachments.
 * Always sends `ctx.history` to the model (no first-message card), so signed
 * file URLs on `richContent.attachments` are mapped by `toLangChainMessages`.
 *
 * Identifier: `langchain-vision`. Sync the playground bridge, then connect a
 * channel to this agent. Prefer `ANTHROPIC_API_KEY` (images + PDF URLs);
 * `OPENAI_API_KEY` covers images only.
 */
export const langchainVisionAgent = agent('langchain-vision', {
  onMessage: async (_message, ctx) => {
    const attachments = formatHistoryAttachments(ctx.history);
    console.log(`[langchain-vision] signed attachments:\n${attachments || '(none)'}`);

    const model = resolveModel();
    if (!model) {
      const hint = attachments
        ? `Signed files on this turn:\n${attachments}`
        : 'No signed attachments on `ctx.history` — the file never made it onto the ledger.';

      return (
        `No LLM key set. Add \`ANTHROPIC_API_KEY\` (images + PDFs) or \`OPENAI_API_KEY\` (images) ` +
        `to \`playground/nextjs/.env\` and restart.\n\n${hint}`
      );
    }

    return {
      model,
      system: SYSTEM_PROMPT,
    };
  },
});
