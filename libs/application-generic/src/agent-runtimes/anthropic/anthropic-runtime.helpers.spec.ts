import {
  CLAUDE_BUILTIN_TOOLS,
  isNovuInternalToolName,
  NOVU_HUMAN_SCHEMA,
  NOVU_RESOLVE_SCHEMA,
  NOVU_TOOL_CATALOG_SCHEMA,
} from '@novu/shared';
import { expect } from 'chai';
import {
  buildPlatformToolsPayload,
  buildToolsPayload,
  ensureSkillRequiredTools,
  MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG,
  mapToolset,
  SKILL_REQUIRED_BUILTIN_TOOL,
  truncateWithEllipsis,
} from './anthropic-runtime.helpers';

describe('mapToolset', () => {
  it('maps enabled builtin toolset configs to AgentToolDto entries', () => {
    const tools = mapToolset({
      type: 'agent_toolset_20260401',
      default_config: { enabled: true, permission_policy: { type: 'always_ask' } },
      configs: [
        { type: 'bash', name: 'bash', enabled: true, permission_policy: { type: 'always_ask' } },
        { type: 'read', name: 'read', enabled: false, permission_policy: { type: 'always_ask' } },
        { type: 'web_search', name: 'web_search', enabled: true, permission_policy: { type: 'always_ask' } },
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
      configs: [],
      default_config: { enabled: true, permission_policy: { type: 'always_ask' } },
    });

    expect(tools).to.deep.equal([]);
  });
});

describe('buildToolsPayload', () => {
  it('sets always_ask on the agent toolset default_config by default', () => {
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

  it('sets always_ask on each mcp_toolset default_config by default', () => {
    const payload = buildToolsPayload(undefined, [{ name: 'GitHub', url: 'https://mcp.example.com/github' }]);
    const mcpToolset = payload.find((entry) => entry.type === 'mcp_toolset');

    expect(mcpToolset).to.deep.equal({
      type: 'mcp_toolset',
      mcp_server_name: 'GitHub',
      default_config: MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG,
    });
  });

  it('includes platform tools when the user has no tools or MCP servers', () => {
    const payload = buildToolsPayload(undefined, undefined);
    const toolset = payload.find((entry) => entry.type === 'agent_toolset_20260401') as {
      configs: Array<{ name: string; enabled: boolean }>;
    };
    const platformTools = payload.filter((entry) => entry.type === 'custom');

    expect(toolset.configs.every((c) => c.enabled === false)).to.equal(true);
    expect(platformTools).to.deep.equal([
      { type: 'custom', ...NOVU_TOOL_CATALOG_SCHEMA },
      { type: 'custom', ...NOVU_RESOLVE_SCHEMA },
      { type: 'custom', ...NOVU_HUMAN_SCHEMA },
    ]);
  });

  it('buildPlatformToolsPayload returns novu_tool_catalog, novu_resolve, and novu_human', () => {
    expect(buildPlatformToolsPayload()).to.deep.equal([
      { type: 'custom', ...NOVU_TOOL_CATALOG_SCHEMA },
      { type: 'custom', ...NOVU_RESOLVE_SCHEMA },
      { type: 'custom', ...NOVU_HUMAN_SCHEMA },
    ]);
  });

  it('isNovuInternalToolName recognizes platform tools only', () => {
    expect(isNovuInternalToolName('novu_tool_catalog')).to.equal(true);
    expect(isNovuInternalToolName('novu_tools')).to.equal(true);
    expect(isNovuInternalToolName('novu_resolve')).to.equal(true);
    expect(isNovuInternalToolName('novu_human')).to.equal(true);
    expect(isNovuInternalToolName('customer_tool')).to.equal(false);
    expect(isNovuInternalToolName(undefined)).to.equal(false);
  });

  it('force-enables read when hasSkills is true', () => {
    const payload = buildToolsPayload(['web_search'], undefined, true);
    const toolset = payload[0] as { configs: Array<{ name: string; enabled: boolean }> };
    const readConfig = toolset.configs.find((c) => c.name === SKILL_REQUIRED_BUILTIN_TOOL);

    expect(readConfig?.enabled).to.equal(true);
  });

  it('does not enable read when hasSkills is false', () => {
    const payload = buildToolsPayload(['web_search'], undefined, false);
    const toolset = payload[0] as { configs: Array<{ name: string; enabled: boolean }> };
    const readConfig = toolset.configs.find((c) => c.name === SKILL_REQUIRED_BUILTIN_TOOL);

    expect(readConfig?.enabled).to.equal(false);
  });
});

describe('ensureSkillRequiredTools', () => {
  it('appends read when skills are present and read is missing', () => {
    expect(ensureSkillRequiredTools(['web_search'], true)).to.deep.equal(['web_search', 'read']);
  });

  it('is idempotent when read is already selected', () => {
    expect(ensureSkillRequiredTools(['read', 'web_search'], true)).to.deep.equal(['read', 'web_search']);
  });

  it('returns the input unchanged when skills are absent', () => {
    expect(ensureSkillRequiredTools(['web_search'], false)).to.deep.equal(['web_search']);
  });
});

describe('truncateWithEllipsis', () => {
  it('shortens eighty ASCII characters at 64 to sixty-three characters plus an ellipsis', () => {
    expect(truncateWithEllipsis('a'.repeat(80), 64)).to.equal(`${'a'.repeat(63)}\u2026`);
  });

  it('returns a string whose length already equals the limit', () => {
    expect(truncateWithEllipsis('a'.repeat(64), 64)).to.equal('a'.repeat(64));
  });

  it('returns a short string unchanged', () => {
    expect(truncateWithEllipsis('short', 64)).to.equal('short');
  });

  it('round-trips a cut that lands on an emoji', () => {
    const result = truncateWithEllipsis(`${'a'.repeat(62)}\u{1F600}extra`, 64);
    const roundTripped = Buffer.from(result, 'utf8').toString('utf8');

    expect(roundTripped).to.equal(result);
    expect(result.includes('\uFFFD')).to.equal(false);
    expect(result.length).to.be.at.most(64);
    expect(result.endsWith('\u2026')).to.equal(true);
  });

  it('keeps an emoji that fits before the ellipsis and still round-trips', () => {
    const result = truncateWithEllipsis(`${'a'.repeat(60)}\u{1F600}xyz`, 64);
    const roundTripped = Buffer.from(result, 'utf8').toString('utf8');

    expect(result.includes('\u{1F600}')).to.equal(true);
    expect(roundTripped).to.equal(result);
  });
});
