import path from 'node:path';
import type { McpClientAdapter } from './types';
import { existsCwd, existsHome, homePath, readJson, upsertMcpServer, writeJson } from './utils';

export const vscodeAdapter: McpClientAdapter = {
  id: 'vscode',
  label: 'VS Code',
  detect: () =>
    existsCwd('.vscode') ||
    existsHome('Library', 'Application Support', 'Code', 'User', 'settings.json') ||
    existsHome('.config', 'Code', 'User', 'settings.json'),
  install: async ({ server }) => {
    const projectFile = path.join(process.cwd(), '.vscode', 'mcp.json');
    const userFile =
      process.platform === 'darwin'
        ? homePath('Library', 'Application Support', 'Code', 'User', 'mcp.json')
        : process.platform === 'win32'
          ? homePath('AppData', 'Roaming', 'Code', 'User', 'mcp.json')
          : homePath('.config', 'Code', 'User', 'mcp.json');
    const target = existsCwd('.vscode') ? projectFile : userFile;
    const payload = readJson(target);
    upsertMcpServer(payload, 'novu', { type: 'stdio', ...server }, 'servers');
    writeJson(target, payload);

    return target;
  },
};
