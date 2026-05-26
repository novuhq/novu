export const MANAGED_AGENT_REPLY_STYLE_MARKER = '\n\n---\n## Messaging reply style\n';

export const MANAGED_AGENT_REPLY_STYLE_INSTRUCTIONS =
  'You operate in messaging channels (Slack, Teams, Telegram, etc.). Match reply length to the question — brief for simple asks, structured only when needed. Markdown is fine for scannability; skip preamble, filler, and essay-length answers unless the user asks for depth.';

export function stripManagedAgentSystemPromptSuffix(systemPrompt: string): string {
  const index = systemPrompt.indexOf(MANAGED_AGENT_REPLY_STYLE_MARKER);

  if (index === -1) {
    return systemPrompt.trimEnd();
  }

  return systemPrompt.slice(0, index).trimEnd();
}

export function composeManagedAgentSystemPrompt(systemPrompt: string | undefined): string {
  const base = stripManagedAgentSystemPromptSuffix(systemPrompt ?? '').trim();
  const suffix = `${MANAGED_AGENT_REPLY_STYLE_MARKER}${MANAGED_AGENT_REPLY_STYLE_INSTRUCTIONS}`;

  if (!base) {
    return suffix.trimStart();
  }

  return `${base}${suffix}`;
}
