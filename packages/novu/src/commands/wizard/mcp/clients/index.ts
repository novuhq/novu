import type { SkillHost } from '../../skills/install-skills';
import { claudeCodeAdapter } from './claude-code';
import { clineAdapter } from './cline';
import { codexAdapter } from './codex';
import { cursorAdapter } from './cursor';
import type { McpClientAdapter } from './types';
import { vscodeAdapter } from './vscode';
import { windsurfAdapter } from './windsurf';

export const ALL_MCP_CLIENT_ADAPTERS: McpClientAdapter[] = [
  cursorAdapter,
  claudeCodeAdapter,
  vscodeAdapter,
  windsurfAdapter,
  codexAdapter,
  clineAdapter,
];

/**
 * Maps an agent / editor "host" (the same key the skills installer uses) to
 * the MCP client adapter id that lays down the Novu MCP server config for
 * that host.
 *
 * Hosts that do not have a first-party MCP client of their own — `agents`
 * (cross-agent fallback dir), `gemini`, `roo`, `opencode`, `kiro` — return
 * `null`. They still receive skill files; they just don't receive an MCP
 * config because there is no canonical place to write one.
 */
const HOST_TO_MCP_CLIENT_ID: Partial<Record<SkillHost, string>> = {
  claude: claudeCodeAdapter.id,
  cursor: cursorAdapter.id,
  windsurf: windsurfAdapter.id,
  copilot: vscodeAdapter.id,
};

export function mapSkillHostToMcpClientId(host: SkillHost): string | null {
  return HOST_TO_MCP_CLIENT_ID[host] ?? null;
}

/**
 * Returns the deduplicated list of MCP client ids that should receive a Novu
 * MCP server config given the resolved skill hosts. Order is preserved so
 * the install step can produce a deterministic sequence of status lines.
 */
export function mapSkillHostsToMcpClientIds(hosts: readonly SkillHost[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const host of hosts) {
    const id = mapSkillHostToMcpClientId(host);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export type { McpClientAdapter } from './types';
