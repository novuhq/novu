import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import type { LlmAuthChoice, LlmAuthPickerOption } from './types';

const OPENAI_API_KEY_OPTION: LlmAuthPickerOption = {
  kind: 'openai-api-key',
  title: 'OpenAI API key',
};

const ANTHROPIC_API_KEY_OPTION: LlmAuthPickerOption = {
  kind: 'anthropic-api-key',
  title: 'Anthropic API key',
};

const ORCAROUTER_API_KEY_OPTION: LlmAuthPickerOption = {
  kind: 'orcarouter-api-key',
  title: 'OrcaRouter API key',
  detail: 'OpenAI-compatible gateway (routing, failover, guardrails)',
};

const CODEX_SUBSCRIPTION_OPTION: LlmAuthPickerOption = {
  kind: 'codex-subscription',
  title: 'ChatGPT subscription (Codex)',
  detail: 'OAuth via Codex CLI',
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
      ORCAROUTER_API_KEY_OPTION,
      CODEX_SUBSCRIPTION_OPTION,
      CLAUDE_SUBSCRIPTION_OPTION,
      SKIP_OPTION,
    ];
  }

  return [
    OPENAI_API_KEY_OPTION,
    ANTHROPIC_API_KEY_OPTION,
    ORCAROUTER_API_KEY_OPTION,
    CODEX_SUBSCRIPTION_OPTION,
    SKIP_OPTION,
  ];
}

export const LLM_AUTH_PICKER_TITLE = 'How do you want to power your agent?';

export const LLM_AUTH_PICKER_SUBTITLE =
  'Optional for local dev. API keys are saved to .env.local; subscriptions use CLI OAuth on your machine.';

export function describeLlmAuthChoice(llmAuth: LlmAuthChoice): string {
  switch (llmAuth.kind) {
    case 'openai-api-key':
      return 'OpenAI API key';
    case 'anthropic-api-key':
      return 'Anthropic API key';
    case 'orcarouter-api-key':
      return 'OrcaRouter API key';
    case 'codex-subscription':
      return 'ChatGPT subscription (Codex CLI)';
    case 'claude-subscription':
      return 'Claude subscription (Claude Code)';
    case 'skip':
      return 'Demo echo (no LLM wired yet)';
  }
}
