/**
 * Every host Agent Inbox has steps for, in the order the picker shows them: the hosts that run commands,
 * then the chat apps. They name the public pages (`/claude-code`, `/claude-code.md`) and are the same ids the
 * CLI, the MCP server and the API use for a host. The catalog is `hosts.ts`; this list stands alone, with no
 * imports, so `next.config.ts` can read it too.
 */
export const HOST_IDS = [
  'claude-code',
  'codex',
  'opencode',
  'cursor',
  'hermes',
  'openclaw',
  'general',
  'claude',
  'chatgpt',
  'grok',
] as const;

export type HostId = (typeof HOST_IDS)[number];

const IDS = new Set<string>(HOST_IDS);

export function isHostId(value: unknown): value is HostId {
  return typeof value === 'string' && IDS.has(value);
}
