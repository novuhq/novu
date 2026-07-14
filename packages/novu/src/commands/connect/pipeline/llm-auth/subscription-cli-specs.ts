/**
 * Pinned npm package@version strings for subscription OAuth CLIs invoked via npx.
 * Avoids `npx --yes <pkg>` fetching an unpinned latest from the registry.
 */
export const SUBSCRIPTION_CLI_NPX_SPECS = {
  codex: '@openai/codex@0.144.0',
  claudeCode: '@anthropic-ai/claude-code@2.1.209',
  langchainCodexOauth: 'langchainjs-codex-oauth@0.1.8',
} as const;

export function npxSubscriptionCliArgs(spec: string, cliArgs: readonly string[]): string[] {
  return ['--yes', spec, ...cliArgs];
}
