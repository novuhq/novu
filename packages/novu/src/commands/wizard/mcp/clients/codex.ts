import fs from 'node:fs';
import type { McpClientAdapter } from './types';
import { existsHome, homePath } from './utils';

/**
 * OpenAI Codex CLI uses a TOML config at `~/.codex/config.toml`. We append
 * (or replace) a single `[mcp_servers.novu]` block — minimal handwritten
 * serialiser since pulling in a TOML lib for one block isn't worth it.
 */
export const codexAdapter: McpClientAdapter = {
  id: 'codex',
  label: 'OpenAI Codex',
  detect: () => existsHome('.codex'),
  install: async ({ server }) => {
    const target = homePath('.codex', 'config.toml');
    fs.mkdirSync(homePath('.codex'), { recursive: true });
    const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    const stripped = stripExistingNovuBlock(existing);
    const block = renderTomlBlock(server);
    const next = `${stripped.trim()}\n\n${block}\n`.trimStart();
    fs.writeFileSync(target, next, 'utf8');

    return target;
  },
};

function stripExistingNovuBlock(source: string): string {
  if (!source) return '';
  const lines = source.split('\n');
  const out: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[mcp_servers\.novu\]$/.test(trimmed)) {
      inBlock = true;
      continue;
    }
    if (inBlock && /^\[/.test(trimmed) && trimmed !== '[mcp_servers.novu]') {
      inBlock = false;
    }
    if (!inBlock) out.push(line);
  }

  return out.join('\n');
}

function renderTomlBlock(server: { command: string; args: string[]; env?: Record<string, string> }): string {
  const lines = ['[mcp_servers.novu]', `command = ${JSON.stringify(server.command)}`];
  lines.push(`args = ${JSON.stringify(server.args)}`);
  if (server.env && Object.keys(server.env).length > 0) {
    lines.push('[mcp_servers.novu.env]');
    for (const [k, v] of Object.entries(server.env)) {
      lines.push(`${k} = ${JSON.stringify(v)}`);
    }
  }

  return lines.join('\n');
}
