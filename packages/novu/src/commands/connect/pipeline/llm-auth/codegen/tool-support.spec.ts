import { describe, expect, it } from 'vitest';
import { aiSdkCodegenSupportsTools, codegenSupportsTools } from './tool-support';

describe('tool-support', () => {
  it('enables tools for AI SDK API-key providers only', () => {
    expect(aiSdkCodegenSupportsTools('openai-api-key')).toBe(true);
    expect(aiSdkCodegenSupportsTools('anthropic-api-key')).toBe(true);
    expect(aiSdkCodegenSupportsTools('orcarouter-api-key')).toBe(true);
    expect(aiSdkCodegenSupportsTools('codex-subscription')).toBe(false);
    expect(aiSdkCodegenSupportsTools('claude-subscription')).toBe(false);
    expect(aiSdkCodegenSupportsTools('skip')).toBe(false);
  });

  it('enables tools for all LangChain wired providers', () => {
    expect(
      codegenSupportsTools({
        runtime: 'langchain',
        agentIdentifier: 'support-agent',
        llmAuth: { kind: 'codex-subscription' },
      })
    ).toBe(true);
  });

  it('disables tools for AI SDK subscription providers', () => {
    expect(
      codegenSupportsTools({
        runtime: 'ai-sdk',
        agentIdentifier: 'support-agent',
        llmAuth: { kind: 'codex-subscription' },
      })
    ).toBe(false);

    expect(
      codegenSupportsTools({
        runtime: 'ai-sdk',
        agentIdentifier: 'support-agent',
        llmAuth: { kind: 'claude-subscription' },
      })
    ).toBe(false);
  });
});
