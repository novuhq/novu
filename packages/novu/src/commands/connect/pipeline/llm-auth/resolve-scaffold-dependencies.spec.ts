import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installTemplate, TemplateTypeEnum } from '../../../init/templates';
import { generateAgentNextConfigSource } from './codegen/generate-agent-next-config';
import { resolveLlmAuthPackageDependencies, resolveLlmAuthPackages } from './registry';
import { resolveBridgeScaffoldDependencies } from './resolve-scaffold-dependencies';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-scaffold-deps-'));
  tempDirs.push(dir);

  return dir;
}

describe('resolveBridgeScaffoldDependencies', () => {
  it('includes langchain runtime deps without a provider when auth is skipped', () => {
    expect(resolveBridgeScaffoldDependencies('langchain', { kind: 'skip' })).toEqual({
      langchain: '^1.0.0',
      '@langchain/core': '^1.0.0',
    });
  });

  it('adds @langchain/openai when OpenAI is selected', () => {
    expect(resolveBridgeScaffoldDependencies('langchain', { kind: 'openai-api-key', apiKey: 'sk-test' })).toEqual({
      langchain: '^1.0.0',
      '@langchain/core': '^1.0.0',
      '@langchain/openai': '^1.0.0',
    });
  });

  it('adds @langchain/anthropic when Anthropic is selected', () => {
    expect(resolveBridgeScaffoldDependencies('langchain', { kind: 'anthropic-api-key', apiKey: 'sk-ant' })).toEqual({
      langchain: '^1.0.0',
      '@langchain/core': '^1.0.0',
      '@langchain/anthropic': '^1.0.0',
    });
  });

  it('adds langchainjs-codex-oauth when Codex subscription is selected', () => {
    expect(resolveBridgeScaffoldDependencies('langchain', { kind: 'codex-subscription' })).toEqual({
      langchain: '^1.0.0',
      '@langchain/core': '^1.0.0',
      'langchainjs-codex-oauth': '0.1.8',
    });
  });

  it('adds @ai-sdk/openai for AI SDK OpenAI selection', () => {
    expect(resolveBridgeScaffoldDependencies('ai-sdk', { kind: 'openai-api-key', apiKey: 'sk-test' })).toEqual({
      ai: '^7.0.0',
      '@ai-sdk/openai': 'latest',
    });
  });
});

describe('generateAgentNextConfigSource provider selection', () => {
  it('always externalizes common LangChain providers for Turbopack-safe model strings', () => {
    const openai = generateAgentNextConfigSource('langchain', { kind: 'openai-api-key', apiKey: 'sk-test' });
    const anthropic = generateAgentNextConfigSource('langchain', { kind: 'anthropic-api-key', apiKey: 'sk-ant' });
    const skip = generateAgentNextConfigSource('langchain', { kind: 'skip' });

    for (const source of [openai, anthropic, skip]) {
      expect(source).toContain("'langchain'");
      expect(source).toContain("'@langchain/openai'");
      expect(source).toContain("'@langchain/anthropic'");
      expect(source).toContain("'@langchain/google-genai'");
    }
  });

  it('aligns serverExternalPackages with installed provider packages', () => {
    for (const llmAuth of [
      { kind: 'openai-api-key' as const, apiKey: 'sk-test' },
      { kind: 'anthropic-api-key' as const, apiKey: 'sk-ant' },
      { kind: 'codex-subscription' as const },
    ]) {
      const deps = resolveLlmAuthPackages('langchain', llmAuth);
      const nextConfig = generateAgentNextConfigSource('langchain', llmAuth);

      for (const pkg of deps) {
        expect(nextConfig).toContain(`'${pkg}'`);
      }

      expect(resolveLlmAuthPackageDependencies('langchain', llmAuth)).toMatchObject(
        Object.fromEntries(deps.map((pkg) => [pkg, expect.any(String)]))
      );
    }
  });
});

describe('installTemplate langchain package wiring', () => {
  it('writes provider package, model-string handler, env, and next.config for OpenAI', async () => {
    const root = makeTempDir();

    await installTemplate({
      appName: 'langchain-demo',
      root,
      packageManager: 'npm',
      isOnline: true,
      template: TemplateTypeEnum.APP_AGENT_LANGCHAIN,
      mode: 'ts',
      eslint: true,
      srcDir: false,
      importAlias: '@/*',
      secretKey: 'nv-test-secret',
      apiUrl: 'https://api.novu.co',
      applicationId: '',
      userId: '',
      agentIdentifier: 'langchain-checl-demo',
      silent: true,
      skipInstall: true,
      llmAuth: { kind: 'openai-api-key', apiKey: 'sk-test-key' },
    });

    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const agentSource = fs.readFileSync(path.join(root, 'app/novu/agents/langchain-checl-demo.tsx'), 'utf8');
    const nextConfig = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');
    const envLocal = fs.readFileSync(path.join(root, '.env.local'), 'utf8');

    expect(packageJson.dependencies.langchain).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/core']).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/openai']).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/anthropic']).toBeUndefined();

    expect(agentSource).toContain("model: 'openai:gpt-4o-mini'");
    expect(agentSource).toContain("agent('langchain-checl-demo'");
    expect(agentSource).not.toContain('ChatOpenAI');

    expect(nextConfig).toContain("'@langchain/openai'");
    expect(envLocal).toContain('OPENAI_API_KEY=sk-test-key');
    expect(envLocal).toContain('NOVU_SECRET_KEY=nv-test-secret');
  });

  it('writes Anthropic provider package and model-string handler when Anthropic is selected', async () => {
    const root = makeTempDir();

    await installTemplate({
      appName: 'langchain-anthropic',
      root,
      packageManager: 'npm',
      isOnline: true,
      template: TemplateTypeEnum.APP_AGENT_LANGCHAIN,
      mode: 'ts',
      eslint: true,
      srcDir: false,
      importAlias: '@/*',
      secretKey: 'nv-test-secret',
      apiUrl: 'https://api.novu.co',
      applicationId: '',
      userId: '',
      agentIdentifier: 'support-agent',
      silent: true,
      skipInstall: true,
      llmAuth: { kind: 'anthropic-api-key', apiKey: 'sk-ant-test' },
    });

    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const agentSource = fs.readFileSync(path.join(root, 'app/novu/agents/support-agent.tsx'), 'utf8');
    const nextConfig = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');
    const envLocal = fs.readFileSync(path.join(root, '.env.local'), 'utf8');

    expect(packageJson.dependencies['@langchain/anthropic']).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/openai']).toBeUndefined();
    expect(agentSource).toContain("model: 'anthropic:claude-haiku-4-5'");
    expect(agentSource).not.toContain('ChatAnthropic');
    expect(nextConfig).toContain("'@langchain/anthropic'");
    expect(envLocal).toContain('ANTHROPIC_API_KEY=sk-ant-test');
  });

  it('omits provider packages for demo echo scaffolds', async () => {
    const root = makeTempDir();

    await installTemplate({
      appName: 'langchain-demo-echo',
      root,
      packageManager: 'npm',
      isOnline: true,
      template: TemplateTypeEnum.APP_AGENT_LANGCHAIN,
      mode: 'ts',
      eslint: true,
      srcDir: false,
      importAlias: '@/*',
      secretKey: 'nv-test-secret',
      apiUrl: 'https://api.novu.co',
      applicationId: '',
      userId: '',
      agentIdentifier: 'support-agent',
      silent: true,
      skipInstall: true,
      llmAuth: { kind: 'skip' },
    });

    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const nextConfig = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');

    expect(packageJson.dependencies.langchain).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/core']).toBe('^1.0.0');
    expect(packageJson.dependencies['@langchain/openai']).toBeUndefined();
    expect(packageJson.dependencies['@langchain/anthropic']).toBeUndefined();
    expect(nextConfig).toContain("'langchain'");
    expect(nextConfig).toContain("'@langchain/openai'");
  });
});
