import { CLAUDE_BUILTIN_TOOLS } from '@novu/shared';
import { expect } from 'chai';
import { buildToolsPayload, MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG, mapToolset } from './anthropic-runtime.helpers';

describe('mapToolset', () => {
  it('maps enabled builtin toolset configs to AgentToolDto entries', () => {
    const tools = mapToolset({
      type: 'agent_toolset_20260401',
      configs: [
        { name: 'bash', enabled: true },
        { name: 'read', enabled: false },
        { name: 'web_search', enabled: true },
      ],
    });

    expect(tools).to.deep.equal([
      { externalId: 'bash', name: 'bash', type: 'builtin' },
      { externalId: 'web_search', name: 'web_search', type: 'builtin' },
    ]);
  });

  it('does not map mcp_toolset entries into tools', () => {
    const tools = mapToolset({
      type: 'mcp_toolset',
      mcp_server_name: 'HubSpot',
    });

    expect(tools).to.deep.equal([]);
  });
});

describe('buildToolsPayload', () => {
  it('sets always_allow on the agent toolset default_config', () => {
    const payload = buildToolsPayload(['bash'], undefined);
    const toolset = payload[0] as {
      type: string;
      default_config: typeof MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG;
      configs: Array<{ name: string; enabled: boolean }>;
    };

    expect(toolset.type).to.equal('agent_toolset_20260401');
    expect(toolset.default_config).to.deep.equal(MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG);
    expect(toolset.configs).to.have.lengthOf(CLAUDE_BUILTIN_TOOLS.length);

    const bashConfig = toolset.configs.find((c) => c.name === 'bash');
    expect(bashConfig?.enabled).to.equal(true);
  });

  it('sets always_allow on each mcp_toolset default_config', () => {
    const payload = buildToolsPayload(undefined, [{ name: 'GitHub', url: 'https://mcp.example.com/github' }]);
    const mcpToolset = payload.find((entry) => entry.type === 'mcp_toolset');

    expect(mcpToolset).to.deep.equal({
      type: 'mcp_toolset',
      mcp_server_name: 'GitHub',
      default_config: MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG,
    });
  });
});
