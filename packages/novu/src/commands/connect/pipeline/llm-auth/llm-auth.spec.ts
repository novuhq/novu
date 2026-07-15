import { describe, expect, it } from 'vitest';
import { generateAgentNextConfigSource } from './codegen/generate-agent-next-config';
import { generateSupportAgentSource } from './codegen/generate-support-agent';
import { getLlmAuthPickerOptions } from './llm-auth-options';
import { resolveLlmAuthEnvVars, resolveLlmAuthPackageDependencies, resolveLlmAuthPackages } from './registry';

describe('llm-auth registry', () => {
  it('resolves OpenAI packages per runtime', () => {
    expect(resolveLlmAuthPackages('ai-sdk', { kind: 'openai-api-key', apiKey: 'sk-test' })).toEqual(['@ai-sdk/openai']);
    expect(resolveLlmAuthPackages('langchain', { kind: 'openai-api-key', apiKey: 'sk-test' })).toEqual([
      '@langchain/openai',
    ]);
  });

  it('writes API keys to env vars', () => {
    expect(resolveLlmAuthEnvVars({ kind: 'openai-api-key', apiKey: 'sk-test' })).toEqual({
      OPENAI_API_KEY: 'sk-test',
    });
    expect(resolveLlmAuthEnvVars({ kind: 'skip' })).toEqual({});
  });

  it('pins subscription providers to zod v4-compatible releases', () => {
    expect(resolveLlmAuthPackageDependencies('ai-sdk', { kind: 'codex-subscription' })).toEqual({
      'ai-sdk-provider-codex-cli': '2.1.1',
      '@openai/codex': '^0.144.0',
    });
    expect(resolveLlmAuthPackageDependencies('ai-sdk', { kind: 'claude-subscription' })).toEqual({
      'ai-sdk-provider-claude-code': '4.0.1',
    });
    expect(resolveLlmAuthPackageDependencies('langchain', { kind: 'codex-subscription' })).toEqual({
      'langchainjs-codex-oauth': '0.1.8',
    });
  });
});

describe('generateAgentNextConfigSource', () => {
  it('externalizes Codex CLI packages for subscription scaffolds', () => {
    const source = generateAgentNextConfigSource('ai-sdk', { kind: 'codex-subscription' });

    expect(source).toContain('turbopack');
    expect(source).toContain("'ai-sdk-provider-codex-cli'");
    expect(source).toContain("'@openai/codex'");
  });

  it('omits serverExternalPackages for API key scaffolds', () => {
    const source = generateAgentNextConfigSource('ai-sdk', { kind: 'openai-api-key', apiKey: 'sk-test' });

    expect(source).toContain('turbopack');
    expect(source).not.toContain('serverExternalPackages');
  });
});

describe('llm-auth picker options', () => {
  it('includes Claude subscription for ai-sdk only', () => {
    const aiSdkKinds = getLlmAuthPickerOptions('ai-sdk').map((opt) => opt.kind);
    const langChainKinds = getLlmAuthPickerOptions('langchain').map((opt) => opt.kind);

    expect(aiSdkKinds).toContain('claude-subscription');
    expect(langChainKinds).not.toContain('claude-subscription');
  });
});

describe('generateSupportAgentSource', () => {
  it('generates wired AI SDK OpenAI handler', () => {
    const source = generateSupportAgentSource({
      runtime: 'ai-sdk',
      agentIdentifier: 'support-agent',
      llmAuth: { kind: 'openai-api-key', apiKey: 'sk-test' },
    });

    expect(source).toContain("import { openai } from '@ai-sdk/openai'");
    expect(source).toContain("model: openai('gpt-4o-mini')");
    expect(source).toContain("from './tools/search-novu-docs'");
    expect(source).toContain('needsApproval: true');
    expect(source).toContain('tools: { searchNovuDocs }');
    expect(source).not.toContain('demo agent');
  });

  it('generates wired LangChain Anthropic handler', () => {
    const source = generateSupportAgentSource({
      runtime: 'langchain',
      agentIdentifier: 'my-agent',
      llmAuth: { kind: 'anthropic-api-key', apiKey: 'sk-ant-test' },
    });

    expect(source).toContain("agent('my-agent'");
    expect(source).toContain("model: 'anthropic:claude-haiku-4-5'");
    expect(source).toContain('tools: [searchNovuDocs]');
    expect(source).toContain("toolCall.name === 'searchNovuDocs'");
    expect(source).toContain('export const myAgent');
  });

  it('generates wired LangChain Codex subscription handler', () => {
    const source = generateSupportAgentSource({
      runtime: 'langchain',
      agentIdentifier: 'support-agent',
      llmAuth: { kind: 'codex-subscription' },
    });

    expect(source).toContain("import { ChatCodexOAuth } from 'langchainjs-codex-oauth'");
    expect(source).toContain("model: new ChatCodexOAuth({ model: 'gpt-5.4-mini' })");
  });

  it('generates wired AI SDK Codex subscription handler without tools', () => {
    const source = generateSupportAgentSource({
      runtime: 'ai-sdk',
      agentIdentifier: 'support-agent',
      llmAuth: { kind: 'codex-subscription' },
    });

    expect(source).toContain("import { codexCli } from 'ai-sdk-provider-codex-cli'");
    expect(source).toContain("model: codexCli('gpt-5.4-mini')");
    expect(source).toContain('Codex CLI does not support AI SDK tools');
    expect(source).not.toContain('tools: { searchNovuDocs }');
    expect(source).not.toContain('needsApproval: true');
  });

  it('generates a valid export name when the identifier starts with a digit', () => {
    const source = generateSupportAgentSource({
      runtime: 'ai-sdk',
      agentIdentifier: '1-agent',
      llmAuth: { kind: 'openai-api-key', apiKey: 'sk-test' },
    });

    expect(source).toContain('export const agent1Agent');
    expect(source).not.toMatch(/export const \d/);
  });
});
