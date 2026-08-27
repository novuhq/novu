import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import type { LlmAuthChoice, LlmAuthKind } from './types';

export type LlmPackageSpec = {
  name: string;
  version: string;
};

export type LlmAuthRegistryEntry = {
  envKey?: string;
  packages: Record<BridgeAdapterVariant, readonly LlmPackageSpec[]>;
};

const REGISTRY: Record<Exclude<LlmAuthKind, 'skip'>, LlmAuthRegistryEntry> = {
  'openai-api-key': {
    envKey: 'OPENAI_API_KEY',
    packages: {
      'ai-sdk': [{ name: '@ai-sdk/openai', version: 'latest' }],
      langchain: [{ name: '@langchain/openai', version: '^1.0.0' }],
    },
  },
  'anthropic-api-key': {
    envKey: 'ANTHROPIC_API_KEY',
    packages: {
      'ai-sdk': [{ name: '@ai-sdk/anthropic', version: 'latest' }],
      langchain: [{ name: '@langchain/anthropic', version: '^1.0.0' }],
    },
  },
  // OrcaRouter is an OpenAI-compatible gateway, so scaffolds reuse the OpenAI
  // provider packages but point them at the OrcaRouter base URL and API key.
  'orcarouter-api-key': {
    envKey: 'ORCAROUTER_API_KEY',
    packages: {
      'ai-sdk': [{ name: '@ai-sdk/openai', version: 'latest' }],
      langchain: [{ name: '@langchain/openai', version: '^1.0.0' }],
    },
  },
  'codex-subscription': {
    packages: {
      'ai-sdk': [
        { name: 'ai-sdk-provider-codex-cli', version: '2.1.1' },
        { name: '@openai/codex', version: '^0.144.0' },
      ],
      langchain: [{ name: 'langchainjs-codex-oauth', version: '0.1.8' }],
    },
  },
  'claude-subscription': {
    packages: {
      'ai-sdk': [{ name: 'ai-sdk-provider-claude-code', version: '4.0.1' }],
      langchain: [],
    },
  },
};

export function resolveLlmAuthPackageSpecs(
  runtime: BridgeAdapterVariant,
  llmAuth: LlmAuthChoice
): readonly LlmPackageSpec[] {
  if (llmAuth.kind === 'skip') {
    return [];
  }

  return REGISTRY[llmAuth.kind].packages[runtime];
}

export function resolveLlmAuthPackages(runtime: BridgeAdapterVariant, llmAuth: LlmAuthChoice): string[] {
  return resolveLlmAuthPackageSpecs(runtime, llmAuth).map((spec) => spec.name);
}

export function resolveLlmAuthPackageDependencies(
  runtime: BridgeAdapterVariant,
  llmAuth: LlmAuthChoice
): Record<string, string> {
  const dependencies: Record<string, string> = {};

  for (const spec of resolveLlmAuthPackageSpecs(runtime, llmAuth)) {
    dependencies[spec.name] = spec.version;
  }

  return dependencies;
}

export function resolveLlmAuthEnvVars(llmAuth: LlmAuthChoice): Record<string, string> {
  if (llmAuth.kind === 'openai-api-key') {
    return { OPENAI_API_KEY: llmAuth.apiKey };
  }

  if (llmAuth.kind === 'anthropic-api-key') {
    return { ANTHROPIC_API_KEY: llmAuth.apiKey };
  }

  if (llmAuth.kind === 'orcarouter-api-key') {
    return { ORCAROUTER_API_KEY: llmAuth.apiKey };
  }

  return {};
}

export function shouldWireLlmAuth(
  llmAuth: LlmAuthChoice | undefined
): llmAuth is Exclude<LlmAuthChoice, { kind: 'skip' }> {
  return llmAuth !== undefined && llmAuth.kind !== 'skip';
}
