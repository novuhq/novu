export function buildAiSdkWiringInstructions(projectDir: string, agentIdentifier: string): string {
  return [
    'Wire your AI SDK agent into this project:',
    '',
    '1. Create app/api/novu/route.ts with serve({ agents: [...] }) from @novu/framework/next',
    `2. Create app/novu/agents/${agentIdentifier}.tsx importing agent from @novu/framework/ai-sdk`,
    '3. Uncomment generateText in the handler when ai + provider packages are installed',
    '4. Run npm run dev:novu for local bridge tunnel',
    '',
    `Project: ${projectDir}`,
  ].join('\n');
}
