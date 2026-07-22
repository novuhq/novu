import type { ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import { ensureSubscriptionAuth } from './ensure-subscription-auth';
import type { LlmAuthChoice, LlmAuthCliChoice, LlmAuthKind } from './types';

type ResolveLlmAuthInput = {
  connectMode: BridgeAdapterVariant;
  options: ConnectCommandOptions;
  ui: ConnectUI;
};

function isSubscriptionKind(kind: LlmAuthKind): kind is 'codex-subscription' | 'claude-subscription' {
  return kind === 'codex-subscription' || kind === 'claude-subscription';
}

function mapCliChoiceToKind(choice: LlmAuthCliChoice, connectMode: BridgeAdapterVariant): LlmAuthKind {
  switch (choice) {
    case 'openai':
      return 'openai-api-key';
    case 'anthropic':
      return 'anthropic-api-key';
    case 'codex-subscription':
      return 'codex-subscription';
    case 'claude-subscription':
      if (connectMode === 'langchain') {
        throw new Error('Claude subscription is only supported for --runtime ai-sdk.');
      }

      return 'claude-subscription';
    case 'skip':
      return 'skip';
  }
}

function resolveApiKeyFromOptions(kind: LlmAuthKind, options: ConnectCommandOptions): string | undefined {
  if (kind === 'openai-api-key') {
    return options.openaiApiKey?.trim();
  }

  if (kind === 'anthropic-api-key') {
    return options.anthropicApiKey?.trim();
  }

  return undefined;
}

async function promptForApiKey(ui: ConnectUI, kind: 'openai-api-key' | 'anthropic-api-key'): Promise<string> {
  const isOpenAi = kind === 'openai-api-key';

  while (true) {
    const value = await ui.promptForSecretInput({
      title: isOpenAi ? 'OpenAI API key' : 'Anthropic API key',
      placeholder: isOpenAi ? 'sk-...' : 'sk-ant-...',
      hint: 'Saved to .env.local in your scaffolded project.',
      secret: true,
    });

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
}

async function resolveFromCliFlags(input: ResolveLlmAuthInput): Promise<LlmAuthChoice> {
  const cliChoice = input.options.llmAuth;
  if (!cliChoice) {
    return { kind: 'skip' };
  }

  const kind = mapCliChoiceToKind(cliChoice, input.connectMode);

  if (kind === 'skip') {
    return { kind: 'skip' };
  }

  if (isSubscriptionKind(kind)) {
    await ensureSubscriptionAuth({ kind, connectMode: input.connectMode, ui: input.ui, ci: input.options.ci });

    return { kind };
  }

  const apiKey = resolveApiKeyFromOptions(kind, input.options);
  if (!apiKey) {
    const flag = kind === 'openai-api-key' ? '--openai-api-key' : '--anthropic-api-key';

    throw new Error(`Non-interactive mode requires ${flag} when --llm-auth is "${cliChoice}".`);
  }

  if (kind === 'openai-api-key') {
    return { kind, apiKey };
  }

  return { kind, apiKey };
}

async function resolveInteractive(input: ResolveLlmAuthInput): Promise<LlmAuthChoice> {
  const kind = await input.ui.pickLlmAuthKind({ connectMode: input.connectMode });

  if (kind === 'skip') {
    return { kind: 'skip' };
  }

  if (isSubscriptionKind(kind)) {
    await ensureSubscriptionAuth({ kind, connectMode: input.connectMode, ui: input.ui, ci: input.options.ci });

    return { kind };
  }

  const apiKey = await promptForApiKey(input.ui, kind);

  if (kind === 'openai-api-key') {
    return { kind, apiKey };
  }

  return { kind, apiKey };
}

export async function resolveLlmAuthChoice(input: ResolveLlmAuthInput): Promise<LlmAuthChoice> {
  if (input.options.ci || input.options.llmAuth) {
    return resolveFromCliFlags(input);
  }

  return resolveInteractive(input);
}
