import path from 'node:path';
import type { McpClientAdapter } from './types';
import { existsCwd, existsHome, homePath, readJson, upsertMcpServer, writeJson } from './utils';

export const cursorAdapter: McpClientAdapter = {
  id: 'cursor',
  label: 'Cursor',
  detect: () => existsCwd('.cursor') || existsHome('.cursor'),
  install: async ({ server }) => {
    const projectFile = path.join(process.cwd(), '.cursor', 'mcp.json');
    const target = existsCwd('.cursor') ? projectFile : homePath('.cursor', 'mcp.json');
    const payload = readJson(target);
    upsertMcpServer(payload, 'novu', { ...server });
    writeJson(target, payload);

    return target;
  },
};
