import type { GenerateSupportAgentInput } from '../types';

function toCamelAgentName(agentIdentifier: string): string {
  const camelName = agentIdentifier.replace(/[-_]([a-z0-9])/g, (_, char) => char.toUpperCase());

  if (/^\d/.test(camelName)) {
    return `agent${camelName.charAt(0).toUpperCase()}${camelName.slice(1)}`;
  }

  return camelName;
}

function buildSharedHandlerBody(): string {
  return `    const firstName = ctx.subscriber?.firstName;
    const text = (message.text ?? '').toLowerCase();

    const isFirstMessage = ctx.conversation.messageCount <= 1;

    if (isFirstMessage) {
      ctx.metadata.set('topic', 'unknown');

      return (
        <Card title={\`Hi\${firstName ? \`, \${firstName}\` : ''}! I'm Support Agent\`}>
          <CardText>How can I help you today?</CardText>
          <Actions>
            <Button id="topic-billing" label="Billing question" value="billing" />
            <Button id="topic-technical" label="Technical issue" value="technical" />
            <Button id="topic-other" label="Something else" value="other" />
          </Actions>
        </Card>
      );
    }

    if (text.includes('resolve') || text.includes('thanks')) {
      ctx.resolve(\`Resolved by user: \${text}\`);

      return 'Glad I could help! Marking this resolved.';
    }

    ctx.metadata.set('lastMessage', text);`;
}

function buildOnActionHandler(): string {
  return `  onAction: async (action, ctx) => {
    if (action.id.startsWith('topic-') && action.value) {
      ctx.metadata.set('topic', action.value);

      return \`Topic set to **\${action.value}**. Describe your issue and I'll help.\`;
    }
  },`;
}

const AGENT_SYSTEM_PROMPT =
  'You are a helpful support agent. Use searchNovuDocs when the user asks how Novu features work or wants documentation links.';

const SEARCH_NOVU_DOCS_EXECUTE = `async ({ query }) => {
  const response = await fetch('https://docs.novu.co/llms.txt');

  if (!response.ok) {
    throw new Error(\`Failed to fetch Novu docs index (\${response.status})\`);
  }

  const index = await response.text();
  const needle = query.toLowerCase();
  const matches = index
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase().includes(needle))
    .slice(0, 5);

  return { query, matches };
}`;

function buildAiSdkSearchNovuDocsTool(): string {
  return `const searchNovuDocs = tool({
  description: 'Search Novu documentation for guides and API references. Requires user approval before running.',
  inputSchema: z.object({
    query: z.string().describe('Topic to search for in Novu docs'),
  }),
  needsApproval: true,
  execute: ${SEARCH_NOVU_DOCS_EXECUTE},
});`;
}

function buildLangChainSearchNovuDocsTool(): string {
  return `const searchNovuDocs = tool(
  ${SEARCH_NOVU_DOCS_EXECUTE},
  {
    name: 'searchNovuDocs',
    description: 'Search Novu documentation for guides and API references. Requires user approval before running.',
    schema: z.object({ query: z.string().describe('Topic to search for in Novu docs') }),
  },
);`;
}

function buildAiSdkGenerateTextReturn(modelLine: string): string {
  return `    return generateText({
      model: ${modelLine},
      instructions: '${AGENT_SYSTEM_PROMPT}',
      messages: toModelMessages(ctx.history),
      tools: { searchNovuDocs },
    });`;
}

function buildLangChainConfigReturn(modelLine: string): string {
  return `    return {
      model: ${modelLine},
      system: '${AGENT_SYSTEM_PROMPT}',
      tools: [searchNovuDocs],
      needsApproval: (toolCall) => toolCall.name === 'searchNovuDocs',
    };`;
}

function buildAiSdkOpenAiHandler(): string {
  return `${buildSharedHandlerBody()}

${buildAiSdkGenerateTextReturn("openai('gpt-4o-mini')")}`;
}

function buildAiSdkAnthropicHandler(): string {
  return `${buildSharedHandlerBody()}

${buildAiSdkGenerateTextReturn("anthropic('claude-haiku-4-5')")}`;
}

function buildAiSdkCodexHandler(): string {
  return `${buildSharedHandlerBody()}

${buildAiSdkGenerateTextReturn("codexCli('gpt-5.4-mini')")}`;
}

function buildAiSdkClaudeSubscriptionHandler(): string {
  return `${buildSharedHandlerBody()}

${buildAiSdkGenerateTextReturn("claudeCode('haiku')")}`;
}

function buildLangChainOpenAiHandler(): string {
  return `${buildSharedHandlerBody()}

${buildLangChainConfigReturn("'openai:gpt-4o-mini'")}`;
}

function buildLangChainAnthropicHandler(): string {
  return `${buildSharedHandlerBody()}

${buildLangChainConfigReturn("'anthropic:claude-haiku-4-5'")}`;
}

function buildLangChainCodexHandler(): string {
  return `${buildSharedHandlerBody()}

${buildLangChainConfigReturn("new ChatCodexOAuth({ model: 'gpt-5.4-mini' })")}`;
}

function buildAiSdkImports(kind: GenerateSupportAgentInput['llmAuth']['kind']): string {
  const base = `/** @jsxImportSource @novu/framework */
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/ai-sdk';
import { generateText, tool } from 'ai';
import { toModelMessages } from '@novu/framework/ai-sdk';
import { z } from 'zod';`;

  if (kind === 'openai-api-key') {
    return `${base}
import { openai } from '@ai-sdk/openai';`;
  }

  if (kind === 'anthropic-api-key') {
    return `${base}
import { anthropic } from '@ai-sdk/anthropic';`;
  }

  if (kind === 'codex-subscription') {
    return `${base}
import { codexCli } from 'ai-sdk-provider-codex-cli';`;
  }

  if (kind === 'claude-subscription') {
    return `${base}
import { claudeCode } from 'ai-sdk-provider-claude-code';`;
  }

  return base;
}

function buildLangChainImports(kind: GenerateSupportAgentInput['llmAuth']['kind']): string {
  const base = `/** @jsxImportSource @novu/framework */
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/langchain';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';`;

  if (kind === 'codex-subscription') {
    return `${base}
import { ChatCodexOAuth } from 'langchainjs-codex-oauth';`;
  }

  return base;
}

function buildOnMessageBody(input: GenerateSupportAgentInput): string {
  const { runtime, llmAuth } = input;

  if (runtime === 'ai-sdk') {
    if (llmAuth.kind === 'openai-api-key') return buildAiSdkOpenAiHandler();
    if (llmAuth.kind === 'anthropic-api-key') return buildAiSdkAnthropicHandler();
    if (llmAuth.kind === 'codex-subscription') return buildAiSdkCodexHandler();
    if (llmAuth.kind === 'claude-subscription') return buildAiSdkClaudeSubscriptionHandler();
  }

  if (runtime === 'langchain') {
    if (llmAuth.kind === 'openai-api-key') return buildLangChainOpenAiHandler();
    if (llmAuth.kind === 'anthropic-api-key') return buildLangChainAnthropicHandler();
    if (llmAuth.kind === 'codex-subscription') return buildLangChainCodexHandler();
  }

  throw new Error(`Unsupported LLM auth "${llmAuth.kind}" for runtime "${runtime}".`);
}

export function generateSupportAgentSource(input: GenerateSupportAgentInput): string {
  const camelName = toCamelAgentName(input.agentIdentifier);
  const imports =
    input.runtime === 'ai-sdk' ? buildAiSdkImports(input.llmAuth.kind) : buildLangChainImports(input.llmAuth.kind);
  const onMessageBody = buildOnMessageBody(input);
  const searchNovuDocsTool =
    input.runtime === 'ai-sdk' ? buildAiSdkSearchNovuDocsTool() : buildLangChainSearchNovuDocsTool();

  return `${imports}

${searchNovuDocsTool}

/**
 * Novu calls these handlers whenever a user sends a message or clicks an action
 * in a connected channel (Slack, Teams, in-app, etc.).
 */
export const ${camelName} = agent('${input.agentIdentifier}', {
  onMessage: async (message, ctx) => {
${onMessageBody}
  },

${buildOnActionHandler()}
});
`;
}
