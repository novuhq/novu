import type { BridgeAdapterVariant } from '../../bridge-adapter/types';
import type { LlmAuthChoice } from '../types';

export function resolveAgentServerExternalPackages(
  runtime: BridgeAdapterVariant,
  llmAuth: LlmAuthChoice
): readonly string[] {
  if (llmAuth.kind === 'codex-subscription') {
    if (runtime === 'ai-sdk') {
      return ['ai-sdk-provider-codex-cli', '@openai/codex'];
    }

    return ['langchainjs-codex-oauth'];
  }

  if (llmAuth.kind === 'claude-subscription') {
    return ['ai-sdk-provider-claude-code', '@anthropic-ai/claude-agent-sdk'];
  }

  return [];
}

export function generateAgentNextConfigSource(runtime: BridgeAdapterVariant, llmAuth: LlmAuthChoice): string {
  const serverExternalPackages = resolveAgentServerExternalPackages(runtime, llmAuth);
  const externalPackagesBlock =
    serverExternalPackages.length > 0
      ? `
  // CLI-based LLM providers spawn subprocesses; keep them out of the Next.js bundle.
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
