import type { BridgeAdapterVariant } from '../bridge-adapter/types';

/** Internal discriminated-union tag used by registry, codegen, and scaffold wiring. */
export type LlmAuthKind =
  | 'openai-api-key'
  | 'anthropic-api-key'
  | 'orcarouter-api-key'
  | 'codex-subscription'
  | 'claude-subscription'
  | 'skip';

/** Short names for `--llm-auth`; mapped to `LlmAuthKind` in `resolve-llm-auth.ts`. */
export type LlmAuthCliChoice =
  | 'openai'
  | 'anthropic'
  | 'orcarouter'
  | 'codex-subscription'
  | 'claude-subscription'
  | 'skip';

export type LlmAuthChoice =
  | { kind: 'openai-api-key'; apiKey: string }
  | { kind: 'anthropic-api-key'; apiKey: string }
  | { kind: 'orcarouter-api-key'; apiKey: string }
  | { kind: 'codex-subscription' }
  | { kind: 'claude-subscription' }
  | { kind: 'skip' };

export type LlmAuthPickerOption = {
  kind: LlmAuthKind;
  title: string;
  detail?: string;
};

export type GenerateSupportAgentInput = {
  runtime: BridgeAdapterVariant;
  agentIdentifier: string;
  llmAuth: LlmAuthChoice;
};
