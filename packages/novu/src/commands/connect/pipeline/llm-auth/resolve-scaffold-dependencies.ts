import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import { resolveLlmAuthPackageDependencies, shouldWireLlmAuth } from './registry';
import type { LlmAuthChoice } from './types';

const LANGCHAIN_RUNTIME_DEPS = {
  langchain: '^1.0.0',
  '@langchain/core': '^1.0.0',
} as const;

const AI_SDK_RUNTIME_DEPS = {
  ai: '^7.0.0',
} as const;

/**
 * Runtime + LLM-provider dependencies written into the scaffold package.json.
 * Provider packages come from the LLM auth registry so OpenAI / Anthropic / Codex
 * selections install the matching `@langchain/*` or `@ai-sdk/*` package.
 */
export function resolveBridgeScaffoldDependencies(
  runtime: BridgeAdapterVariant,
  llmAuth: LlmAuthChoice | undefined
): Record<string, string> {
  const dependencies: Record<string, string> = {};

  if (runtime === 'langchain') {
    Object.assign(dependencies, LANGCHAIN_RUNTIME_DEPS);
  }

  if (runtime === 'ai-sdk') {
    Object.assign(dependencies, AI_SDK_RUNTIME_DEPS);
  }

  if (llmAuth && shouldWireLlmAuth(llmAuth)) {
    Object.assign(dependencies, resolveLlmAuthPackageDependencies(runtime, llmAuth));
  }

  return dependencies;
}
