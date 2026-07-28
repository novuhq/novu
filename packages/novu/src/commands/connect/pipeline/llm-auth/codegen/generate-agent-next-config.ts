import type { BridgeAdapterVariant } from '../../bridge-adapter/types';
import type { LlmAuthChoice } from '../types';

/**
 * Packages that LangChain resolves via runtime `import(packageName)` (model strings like
 * `openai:gpt-4o`). Next.js Turbopack cannot analyze those expressions and throws
 * "Cannot find module as expression is too dynamic" unless the packages stay external.
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
  }

  if (llmAuth.kind === 'codex-subscription') {
    if (runtime === 'ai-sdk') {
      packages.add('ai-sdk-provider-codex-cli');
      packages.add('@openai/codex');
    } else {
      packages.add('langchainjs-codex-oauth');
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
