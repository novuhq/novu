export function buildLangChainWiringInstructions(projectDir: string, agentIdentifier: string): string {
  return [
    'Wire your LangChain agent into this project:',
    '',
    '1. Create app/api/novu/route.ts with serve({ agents: [...] }) from @novu/framework/next',
    `2. Create app/novu/agents/${agentIdentifier}.tsx with agent() from @novu/framework/langchain`,
    '3. In the agent handler, return { model, system, tools } (install `langchain` + `@langchain/core` and a provider, e.g. @langchain/openai) — prefer a Chat* instance for `model`, or add langchain packages to Next.js `serverExternalPackages` if using model strings',
    '4. Run npm run dev:novu for local bridge tunnel',
    '',
    `Project: ${projectDir}`,
  ].join('\n');
}
