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

function buildAiSdkOpenAiHandler(): string {
  return `${buildSharedHandlerBody()}

    return generateText({
      model: openai('gpt-4o-mini'),
      instructions: 'You are a helpful support agent.',
      messages: toModelMessages(ctx.history),
    });`;
}

function buildAiSdkAnthropicHandler(): string {
  return `${buildSharedHandlerBody()}

    return generateText({
      model: anthropic('claude-haiku-4-5'),
      instructions: 'You are a helpful support agent.',
      messages: toModelMessages(ctx.history),
    });`;
}

function buildAiSdkCodexHandler(): string {
  return `${buildSharedHandlerBody()}

    return generateText({
      model: codexCli('gpt-5.4-mini'),
      instructions: 'You are a helpful support agent.',
      messages: toModelMessages(ctx.history),
    });`;
}

function buildAiSdkClaudeSubscriptionHandler(): string {
  return `${buildSharedHandlerBody()}

    return generateText({
      model: claudeCode('haiku'),
      instructions: 'You are a helpful support agent.',
      messages: toModelMessages(ctx.history),
    });`;
}

function buildLangChainOpenAiHandler(): string {
  return `${buildSharedHandlerBody()}

    return {
      model: 'openai:gpt-4o-mini',
      system: 'You are a helpful support agent.',
      tools: [],
    };`;
}

function buildLangChainAnthropicHandler(): string {
  return `${buildSharedHandlerBody()}

    return {
      model: 'anthropic:claude-haiku-4-5',
      system: 'You are a helpful support agent.',
      tools: [],
    };`;
}

function buildLangChainCodexHandler(): string {
  return `${buildSharedHandlerBody()}

    return {
      model: new ChatCodexOAuth({ model: 'gpt-5.4-mini' }),
      system: 'You are a helpful support agent.',
      tools: [],
    };`;
}

function buildAiSdkImports(kind: GenerateSupportAgentInput['llmAuth']['kind']): string {
  const base = `/** @jsxImportSource @novu/framework */
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/ai-sdk';
import { generateText } from 'ai';
import { toModelMessages } from '@novu/framework/ai-sdk';`;

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
import { agent } from '@novu/framework/langchain';`;

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

  return `${imports}

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
