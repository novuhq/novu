import type { GenerateSupportAgentInput, LlmAuthKind } from '../types';

export function aiSdkCodegenSupportsTools(kind: LlmAuthKind): boolean {
  return kind === 'openai-api-key' || kind === 'anthropic-api-key' || kind === 'orcarouter-api-key';
}

export function codegenSupportsTools(input: GenerateSupportAgentInput): boolean {
  if (input.runtime === 'langchain') {
    return true;
  }

  return aiSdkCodegenSupportsTools(input.llmAuth.kind);
}
