import type { ResolvedAuth } from '../types';
import type { McpClientCandidate, McpInstallResult } from '../ui/wizard-session';
import { ALL_MCP_CLIENT_ADAPTERS, type McpClientAdapter } from './clients';
import { buildNovuMcpServerConfig } from './server-config';

export type McpInstaller = {
  detect: () => McpClientCandidate[];
  install: (clientId: string, config: { auth: ResolvedAuth; mcpUrlOverride?: string }) => Promise<McpInstallResult>;
};

/**
 * Detects locally installed editors / agents and writes the Novu MCP server
 * configuration into the one the user picks. Detection is fs-only — no
 * subprocesses are spawned, no network calls are made.
 */
export function createMcpInstaller(adapters: McpClientAdapter[] = ALL_MCP_CLIENT_ADAPTERS): McpInstaller {
  const byId = new Map(adapters.map((adapter) => [adapter.id, adapter]));

  return {
    detect: () =>
      adapters.map((adapter) => ({
        id: adapter.id,
        label: adapter.label,
        detected: safeDetect(adapter),
      })),
    install: async (clientId, { auth, mcpUrlOverride }) => {
      const adapter = byId.get(clientId);
      if (!adapter) {
        throw new Error(`Unknown MCP client "${clientId}"`);
      }
      const server = buildNovuMcpServerConfig({ auth, mcpUrlOverride });
      const configPath = await adapter.install({ auth, mcpUrlOverride, server });

      return { clientId: adapter.id, clientLabel: adapter.label, configPath };
    },
  };
}

function safeDetect(adapter: McpClientAdapter): boolean {
  try {
    return adapter.detect();
  } catch {
    return false;
  }
}
