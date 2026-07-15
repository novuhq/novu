import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import type { LlmAuthPickerOption } from './types';

const OPENAI_API_KEY_OPTION: LlmAuthPickerOption = {
  kind: 'openai-api-key',
  title: 'OpenAI API key',
};

const ANTHROPIC_API_KEY_OPTION: LlmAuthPickerOption = {
  kind: 'anthropic-api-key',
  title: 'Anthropic API key',
};

const CODEX_SUBSCRIPTION_OPTION: LlmAuthPickerOption = {
  kind: 'codex-subscription',
  title: 'ChatGPT subscription (Codex)',
  detail: 'OAuth via Codex CLI (tools not supported — use an API key to try tool approval)',
};

const CLAUDE_SUBSCRIPTION_OPTION: LlmAuthPickerOption = {
  kind: 'claude-subscription',
  title: 'Claude subscription (Claude Code)',
  detail: 'OAuth via claude login',
};

const SKIP_OPTION: LlmAuthPickerOption = {
  kind: 'skip',
  title: 'Skip for now (demo echo)',
};

export function getLlmAuthPickerOptions(connectMode: BridgeAdapterVariant): readonly LlmAuthPickerOption[] {
  if (connectMode === 'ai-sdk') {
    return [
      OPENAI_API_KEY_OPTION,
      ANTHROPIC_API_KEY_OPTION,
      CODEX_SUBSCRIPTION_OPTION,
      CLAUDE_SUBSCRIPTION_OPTION,
      SKIP_OPTION,
    ];
  }

  return [OPENAI_API_KEY_OPTION, ANTHROPIC_API_KEY_OPTION, CODEX_SUBSCRIPTION_OPTION, SKIP_OPTION];
}

export const LLM_AUTH_PICKER_TITLE = 'How do you want to power your agent?';

export const LLM_AUTH_PICKER_SUBTITLE =
  'Optional for local dev. API keys are saved to .env.local; subscriptions use CLI OAuth on your machine.';
