import type { McpClientAdapter } from './types';
import { existsCwd, existsHome, homePath, readJson, upsertMcpServer, writeJson } from './utils';

export const clineAdapter: McpClientAdapter = {
  id: 'cline',
  label: 'Cline',
  detect: () => existsCwd('.clinerules') || existsHome('.cline'),
  install: async ({ server }) => {
    const target = homePath('.cline', 'mcp.json');
    const payload = readJson(target);
    upsertMcpServer(payload, 'novu', { ...server });
    writeJson(target, payload);

    return target;
  },
};
