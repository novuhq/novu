import { APIError } from '@anthropic-ai/sdk';
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
  extractApiErrorMessage,
  isDuplicateDisplayTitleError,
  MANAGED_AGENT_DEFAULT_PERMISSION_CONFIG,
  mapToolset,
  SKILL_REQUIRED_BUILTIN_TOOL,
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

describe('extractApiErrorMessage', () => {
  it('returns the trimmed provider message from the response body', () => {
    const err = new APIError(
      401,
      { type: 'error', error: { type: 'authentication_error', message: '  invalid x-api-key  ' } },
      'constructor fallback',
      new Headers()
    );

    expect(err.apiMessage).to.equal('  invalid x-api-key  ');
    expect(err.message).to.not.equal('invalid x-api-key');
    expect(extractApiErrorMessage(err)).to.equal('invalid x-api-key');
  });

  it('returns the SDK message when the body has no provider message', () => {
    const err = new APIError(401, { type: 'error' }, 'constructor fallback', new Headers());

    expect(err.apiMessage).to.equal(null);
    expect(extractApiErrorMessage(err)).to.equal(err.message);
    expect(extractApiErrorMessage(err)).to.match(/^401 /);
  });

  it('returns the SDK message when the provider message is blank', () => {
    const err = new APIError(
      401,
      { type: 'error', error: { type: 'authentication_error', message: '   ' } },
      'constructor fallback',
      new Headers()
    );

    expect(extractApiErrorMessage(err)).to.equal(err.message);
  });
});

describe('isDuplicateDisplayTitleError', () => {
  it('matches a 400 whose provider message names a reused display title', () => {
    const err = new APIError(
      400,
      {
        type: 'error',
        error: { type: 'invalid_request_error', message: 'Skill cannot REUSE AN EXISTING DISPLAY_TITLE: foo' },
      },
      'constructor fallback',
      new Headers()
    );

    expect(isDuplicateDisplayTitleError(err)).to.equal(true);
  });

  it('matches a 400 from the SDK message when the body has no provider message', () => {
    const err = new APIError(
      400,
      { type: 'error', note: 'reuse an existing display_title' },
      'constructor fallback',
      new Headers()
    );

    expect(err.apiMessage).to.equal(null);
    expect(isDuplicateDisplayTitleError(err)).to.equal(true);
  });

  it('rejects a non-400, a plain Error, and an unrelated 400', () => {
    const unauthorized = new APIError(
      401,
      { type: 'error', error: { message: 'reuse an existing display_title' } },
      'constructor fallback',
      new Headers()
    );
    const mismatch = new APIError(
      400,
      { type: 'error', error: { message: 'Skill name mismatch' } },
      'constructor fallback',
      new Headers()
    );

    expect(isDuplicateDisplayTitleError(unauthorized)).to.equal(false);
    expect(isDuplicateDisplayTitleError(new Error('reuse an existing display_title'))).to.equal(false);
    expect(isDuplicateDisplayTitleError(undefined)).to.equal(false);
    expect(isDuplicateDisplayTitleError(mismatch)).to.equal(false);
  });

  it('does not treat a 400 as a duplicate when only some other body field names the title', () => {
    const err = new APIError(
      400,
      {
        type: 'error',
        error: { message: 'Skill name mismatch' },
        note: 'reuse an existing display_title',
      },
      'constructor fallback',
      new Headers()
    );

    expect(err.apiMessage).to.equal('Skill name mismatch');
    expect(err.message).to.match(/reuse an existing display_title/);
    expect(isDuplicateDisplayTitleError(err)).to.equal(false);
  });
});
