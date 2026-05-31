import path from 'node:path';
import type { McpClientAdapter } from './types';
import { existsCwd, existsHome, homePath, readJson, upsertMcpServer, writeJson } from './utils';

export const claudeCodeAdapter: McpClientAdapter = {
  id: 'claude-code',
  label: 'Claude Code',
  detect: () => existsCwd('.claude') || existsHome('.claude.json') || existsHome('.claude'),
  install: async ({ server }) => {
    const projectFile = path.join(process.cwd(), '.mcp.json');
    const homeFile = homePath('.claude.json');
    const target = existsCwd('.claude') ? projectFile : homeFile;
    const payload = readJson(target);
    upsertMcpServer(payload, 'novu', { type: 'stdio', ...server });
    writeJson(target, payload);

    return target;
  },
};
