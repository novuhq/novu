import { CLAUDE_BUILTIN_TOOLS } from '@novu/shared';
import { AnthropicAgentRuntimeProvider, createAnthropicProvider } from './anthropic-agent-runtime.provider';

type AgentToolsetConfigEntry = { name: string; enabled: boolean };
type AgentToolsetPayloadEntry = {
  type: string;
  configs?: AgentToolsetConfigEntry[];
  mcp_server_name?: string;
};

function installMockClient(
  provider: AnthropicAgentRuntimeProvider,
  options: {
    retrieve: jest.Mock;
    update: jest.Mock;
  }
) {
  const mockClient = {
    beta: {
      agents: {
        retrieve: options.retrieve,
        update: options.update,
      },
    },
  };

  // `buildClient` is private; injecting via cast keeps the test independent of the SDK constructor.
  (provider as unknown as { buildClient: () => unknown }).buildClient = () => mockClient;
}

function getToolsetPayload(updatePayload: {
  tools?: AgentToolsetPayloadEntry[];
}): AgentToolsetPayloadEntry | undefined {
  return updatePayload.tools?.find((t) => t.type === 'agent_toolset_20260401');
}

describe('AnthropicAgentRuntimeProvider', () => {
  describe('updateConfig', () => {
    it('uses tool externalId (not display name) when serialising the toolset payload', async () => {
      const provider = createAnthropicProvider('test-key');

      const retrieve = jest.fn().mockResolvedValue({
        version: 1,
        tools: [],
        mcp_servers: [],
      });

      const update = jest.fn().mockResolvedValue({
        model: 'claude-sonnet-4-5',
        system: '',
        tools: [
          {
            type: 'agent_toolset_20260401',
            configs: [{ name: 'bash', enabled: true }],
          },
        ],
        mcp_servers: [],
        skills: [],
      });

      installMockClient(provider, { retrieve, update });

      const result = await provider.updateConfig('ext-agent-id', {
        tools: [{ externalId: 'bash', name: 'Bash', type: 'builtin' }],
      });

      expect(update).toHaveBeenCalledTimes(1);

      const [, updatePayload] = update.mock.calls[0];
      const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });

      expect(toolset).toBeDefined();

      const bashConfig = toolset?.configs?.find((c) => c.name === 'bash');
      expect(bashConfig).toBeDefined();
      expect(bashConfig?.enabled).toBe(true);

      const allBuiltinTypes = CLAUDE_BUILTIN_TOOLS.map((t) => t.type);
      const otherToolsDisabled = toolset?.configs
        ?.filter((c) => c.name !== 'bash')
        .every((c) => allBuiltinTypes.includes(c.name) && c.enabled === false);
      expect(otherToolsDisabled).toBe(true);

      expect(result.tools).toEqual([{ externalId: 'bash', name: 'bash', type: 'builtin' }]);
    });

    it('treats an empty tools array as "disable all tools" by emitting enabled=false for every catalog entry', async () => {
      const provider = createAnthropicProvider('test-key');

      const retrieve = jest.fn().mockResolvedValue({
        version: 1,
        tools: [
          {
            type: 'agent_toolset_20260401',
            configs: CLAUDE_BUILTIN_TOOLS.map((t) => ({ name: t.type, enabled: true })),
          },
        ],
        mcp_servers: [],
      });

      const update = jest.fn().mockResolvedValue({
        model: 'claude-sonnet-4-5',
        system: '',
        tools: [],
        mcp_servers: [],
        skills: [],
      });

      installMockClient(provider, { retrieve, update });

      await provider.updateConfig('ext-agent-id', { tools: [] });

      const [, updatePayload] = update.mock.calls[0];
      // With no enabled tools and no mcpServers, buildToolsPayload returns []
      // and we deliberately omit `tools` from the update payload entirely so
      // we don't clear the side the caller didn't touch.
      expect((updatePayload as { tools?: unknown }).tools).toBeUndefined();
    });

    it('preserves currently-enabled tools (by externalId) when only mcpServers is patched', async () => {
      const provider = createAnthropicProvider('test-key');

      const retrieve = jest.fn().mockResolvedValue({
        version: 1,
        tools: [
          {
            type: 'agent_toolset_20260401',
            configs: [
              { name: 'bash', enabled: true },
              { name: 'web_search', enabled: true },
              { name: 'read', enabled: false },
            ],
          },
        ],
        mcp_servers: [],
      });

      const update = jest.fn().mockResolvedValue({
        model: 'claude-sonnet-4-5',
        system: '',
        tools: [
          {
            type: 'agent_toolset_20260401',
            configs: [
              { name: 'bash', enabled: true },
              { name: 'web_search', enabled: true },
            ],
          },
        ],
        mcp_servers: [{ name: 'Slack', url: 'https://mcp.slack.com/mcp' }],
        skills: [],
      });

      installMockClient(provider, { retrieve, update });

      await provider.updateConfig('ext-agent-id', {
        mcpServers: [{ externalId: 'Slack', name: 'Slack', url: 'https://mcp.slack.com/mcp' }],
      });

      const [, updatePayload] = update.mock.calls[0];
      const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });

      const enabledNames = toolset?.configs?.filter((c) => c.enabled).map((c) => c.name) ?? [];
      expect(enabledNames).toEqual(expect.arrayContaining(['bash', 'web_search']));
      expect(enabledNames).not.toContain('read');
    });
  });
});
