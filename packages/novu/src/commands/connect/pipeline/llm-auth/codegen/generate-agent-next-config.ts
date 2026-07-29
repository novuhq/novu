import type { BridgeAdapterVariant } from '../../bridge-adapter/types';
import { resolveLlmAuthPackages } from '../registry';
import type { LlmAuthChoice } from '../types';

/**
 * LangChain packages that must stay outside the Turbopack bundle.
 * Model strings and createAgent pull these in via runtime dynamic import().
 *
 * Common provider packages are always listed so demo/skip scaffolds still work
 * when users later `npm install @langchain/openai` and uncomment a model string
 * without editing next.config.
 *
 * @see https://github.com/langchain-ai/langchainjs/issues/10818
 */
const LANGCHAIN_SERVER_EXTERNAL_PACKAGES = [
  'langchain',
  '@langchain/core',
  '@langchain/langgraph',
  '@langchain/langgraph-checkpoint',
  '@langchain/openai',
  '@langchain/anthropic',
  '@langchain/google-genai',
] as const;

export function resolveAgentServerExternalPackages(
  runtime: BridgeAdapterVariant,
  llmAuth: LlmAuthChoice
): readonly string[] {
  const packages = new Set<string>();

  if (runtime === 'langchain') {
    for (const pkg of LANGCHAIN_SERVER_EXTERNAL_PACKAGES) {
      packages.add(pkg);
    }

    // Also include any selected auth package not in the common list (e.g. Codex OAuth).
    for (const pkg of resolveLlmAuthPackages(runtime, llmAuth)) {
      packages.add(pkg);
    }
  }

  if (llmAuth.kind === 'codex-subscription') {
    if (runtime === 'ai-sdk') {
      packages.add('ai-sdk-provider-codex-cli');
      packages.add('@openai/codex');
    }
  }

  if (llmAuth.kind === 'claude-subscription') {
    packages.add('ai-sdk-provider-claude-code');
    packages.add('@anthropic-ai/claude-agent-sdk');
  }

  return [...packages];
}

export function generateAgentNextConfigSource(runtime: BridgeAdapterVariant, llmAuth: LlmAuthChoice): string {
  const serverExternalPackages = resolveAgentServerExternalPackages(runtime, llmAuth);
  const externalPackagesBlock =
    serverExternalPackages.length > 0
      ? `
  // Keep LLM packages out of the Turbopack bundle.
  // LangChain model strings (e.g. "openai:gpt-4o") use dynamic import() that Turbopack rejects.
  serverExternalPackages: [
${serverExternalPackages.map((pkg) => `    '${pkg}',`).join('\n')}
  ],`
      : '';

  return `import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },${externalPackagesBlock}
};

export default nextConfig;
`;
}
