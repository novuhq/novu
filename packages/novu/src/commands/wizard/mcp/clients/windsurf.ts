import type { McpClientAdapter } from './types';
import { existsHome, homePath, readJson, upsertMcpServer, writeJson } from './utils';

export const windsurfAdapter: McpClientAdapter = {
  id: 'windsurf',
  label: 'Windsurf',
  detect: () => existsHome('.codeium', 'windsurf'),
  install: async ({ server }) => {
    const target = homePath('.codeium', 'windsurf', 'mcp_config.json');
    const payload = readJson(target);
    upsertMcpServer(payload, 'novu', { ...server });
    writeJson(target, payload);

    return target;
  },
};
