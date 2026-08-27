import type { GenerateSupportAgentInput } from '../types';
import { aiSdkCodegenSupportsTools, codegenSupportsTools } from './tool-support';

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

const AGENT_SYSTEM_PROMPT_WITH_TOOLS =
  'You are a helpful support agent. Use searchNovuDocs to find Novu documentation.';
const AGENT_SYSTEM_PROMPT = 'You are a helpful support agent.';

function buildAiSdkSearchNovuDocsTool(): string {
  return `const searchNovuDocs = tool({
  description: 'Search Novu documentation for relevant guides.',
  inputSchema: searchNovuDocsInputSchema,
  needsApproval: true,
  execute: async ({ query }) => ({ matches: await searchNovuDocsIndex(query) }),
});`;
}

function buildLangChainSearchNovuDocsTool(): string {
  return `const searchNovuDocs = tool(
  async ({ query }) => ({ matches: await searchNovuDocsIndex(query) }),
  {
    name: 'searchNovuDocs',
    description: 'Search Novu documentation for relevant guides.',
    schema: searchNovuDocsInputSchema,
  },
);`;
}

function buildAiSdkGenerateTextReturn(modelLine: string, withTools: boolean): string {
  const instructions = withTools ? AGENT_SYSTEM_PROMPT_WITH_TOOLS : AGENT_SYSTEM_PROMPT;
  const toolsLine = withTools ? '\n      tools: { searchNovuDocs },' : '';

  return `    return generateText({
      model: ${modelLine},
      instructions: '${instructions}',
      messages: await hydrateUnreachableAttachmentUrls(toModelMessages(ctx)),${toolsLine}
    });`;
}

function buildLangChainConfigReturn(modelLine: string): string {
  return `    return {
      model: ${modelLine},
      system: '${AGENT_SYSTEM_PROMPT_WITH_TOOLS}',
      tools: [searchNovuDocs],
      needsApproval: (toolCall) => toolCall.name === 'searchNovuDocs',
    };`;
}

function buildAiSdkHandler(input: GenerateSupportAgentInput, modelLine: string): string {
  const withTools = codegenSupportsTools(input);

  return `${buildSharedHandlerBody()}

${buildAiSdkGenerateTextReturn(modelLine, withTools)}`;
}

function buildLangChainHandler(modelLine: string): string {
  return `${buildSharedHandlerBody()}

${buildLangChainConfigReturn(modelLine)}`;
}

function buildOnMessageBody(input: GenerateSupportAgentInput): string {
  const { runtime, llmAuth } = input;

  if (runtime === 'ai-sdk') {
    if (llmAuth.kind === 'openai-api-key') return buildAiSdkHandler(input, "openai('gpt-4o-mini')");
    if (llmAuth.kind === 'anthropic-api-key') return buildAiSdkHandler(input, "anthropic('claude-haiku-4-5')");
    if (llmAuth.kind === 'orcarouter-api-key') {
      return buildAiSdkHandler(
        input,
        "createOpenAI({ baseURL: 'https://api.orcarouter.ai/v1', apiKey: process.env.ORCAROUTER_API_KEY })('openai/gpt-4o-mini')"
      );
    }
    if (llmAuth.kind === 'codex-subscription') return buildAiSdkHandler(input, "codexCli('gpt-5.4-mini')");
    if (llmAuth.kind === 'claude-subscription') return buildAiSdkHandler(input, "claudeCode('haiku')");
  }

  if (runtime === 'langchain') {
    if (llmAuth.kind === 'openai-api-key') return buildLangChainHandler("'openai:gpt-4o-mini'");
    if (llmAuth.kind === 'anthropic-api-key') return buildLangChainHandler("'anthropic:claude-haiku-4-5'");
    if (llmAuth.kind === 'orcarouter-api-key') {
      return buildLangChainHandler(
        "new ChatOpenAI({ model: 'openai/gpt-4o-mini', apiKey: process.env.ORCAROUTER_API_KEY, configuration: { baseURL: 'https://api.orcarouter.ai/v1' } })"
      );
    }
    if (llmAuth.kind === 'codex-subscription') {
      return buildLangChainHandler("new ChatCodexOAuth({ model: 'gpt-5.4-mini' })");
    }
  }

  throw new Error(`Unsupported LLM auth "${llmAuth.kind}" for runtime "${runtime}".`);
}

function buildAiSdkImports(kind: GenerateSupportAgentInput['llmAuth']['kind']): string {
  const withTools = aiSdkCodegenSupportsTools(kind);
  const toolImports = withTools
    ? `import { generateText, tool } from 'ai';
import { hydrateUnreachableAttachmentUrls, toModelMessages } from '@novu/framework/ai-sdk';
import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs';`
    : `import { generateText } from 'ai';
import { hydrateUnreachableAttachmentUrls, toModelMessages } from '@novu/framework/ai-sdk';`;

  const base = `/** @jsxImportSource @novu/framework */
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/ai-sdk';
${toolImports}`;

  if (kind === 'openai-api-key') {
    return `${base}
import { openai } from '@ai-sdk/openai';`;
  }

  if (kind === 'orcarouter-api-key') {
    return `${base}
import { createOpenAI } from '@ai-sdk/openai';`;
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
import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs';`;

  if (kind === 'orcarouter-api-key') {
    return `${base}
import { ChatOpenAI } from '@langchain/openai';`;
  }

  if (kind === 'codex-subscription') {
    return `${base}
import { ChatCodexOAuth } from 'langchainjs-codex-oauth';`;
  }

  return base;
}

export function generateSupportAgentSource(input: GenerateSupportAgentInput): string {
  const camelName = toCamelAgentName(input.agentIdentifier);
  const imports =
    input.runtime === 'ai-sdk' ? buildAiSdkImports(input.llmAuth.kind) : buildLangChainImports(input.llmAuth.kind);
  const onMessageBody = buildOnMessageBody(input);
  const withTools = codegenSupportsTools(input);
  const toolSection = withTools
    ? input.runtime === 'ai-sdk'
      ? buildAiSdkSearchNovuDocsTool()
      : buildLangChainSearchNovuDocsTool()
    : '';

  return `${imports}${toolSection ? `\n\n${toolSection}` : ''}

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
