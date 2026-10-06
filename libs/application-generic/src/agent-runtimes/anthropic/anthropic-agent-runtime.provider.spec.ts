import { APIError } from '@anthropic-ai/sdk';
import { CLAUDE_BUILTIN_TOOLS } from '@novu/shared';
import { expect } from 'chai';
import { AgentRuntimeBadRequestError } from '../errors';
import type { UploadSkillInput } from '../i-agent-runtime-provider';

// We replace the default export of `@anthropic-ai/sdk` with a jest mock so the
// constructor returns whatever client we set per-test. Error classes keep
// their real implementations so `instanceof APIError` checks inside the
// provider continue to work. `toFile` is a stub: the production code only
// uses its return value as opaque uploadables, so a passthrough is enough
// and avoids relying on Web `File` being exposed in the Jest sandbox.
jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk');

  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
    toFile: jest.fn((content: unknown, path: string) => Promise.resolve({ path, content })),
  };
});

// eslint-disable-next-line import/first, import/order
import Anthropic from '@anthropic-ai/sdk';
// eslint-disable-next-line import/first, import/order
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { AnthropicAgentRuntimeProvider, createAnthropicProvider } from './anthropic-agent-runtime.provider';

const SKILL_MD = `---
name: my-skill
description: A skill for tests.
---

# Body
`;

function buildInput(overrides: Partial<UploadSkillInput> = {}): UploadSkillInput {
  return {
    files: [{ path: 'SKILL.md', content: Buffer.from(SKILL_MD, 'utf8') }],
    displayTitle: 'samber-golang-benchmark',
    ...overrides,
  };
}

function buildDuplicateDisplayTitleError(displayTitle = 'samber-golang-benchmark'): APIError {
  // Construct an `APIError` whose embedded body matches the actual Anthropic
  // shape we want to detect. The string form is mirrored into the top-level
  // `message` so either side of `isDuplicateDisplayTitleError` matches.
  const body = {
    type: 'error',
    error: {
      type: 'invalid_request_error',
      message: `Skill cannot reuse an existing display_title: ${displayTitle}`,
    },
  };

  return new APIError(400, body, JSON.stringify(body), undefined as unknown as Headers);
}

interface MockClient {
  beta: {
    skills: {
      create: jest.Mock;
      list: jest.Mock;
      versions: {
        create: jest.Mock;
      };
    };
  };
}

function buildMockClient(): MockClient {
  return {
    beta: {
      skills: {
        create: jest.fn(),
        list: jest.fn(),
        versions: {
          create: jest.fn(),
        },
      },
    },
  };
}

/**
 * Wrap an array of pages (each page is an array of skills) so it behaves like
 * the SDK's auto-paginating cursor — async-iterable that yields each entry in
 * page order. The provider only consumes via `for await`, so we don't need to
 * implement the full PagePromise contract.
 */
function asPagedAsyncIterable<T>(pages: T[][]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const page of pages) {
        for (const item of page) {
          yield item;
        }
      }
    },
  };
}

interface AgentToolsetConfigEntry {
  name: string;
  enabled: boolean;
}

interface AgentToolsetPayloadEntry {
  type: string;
  name?: string;
  configs?: AgentToolsetConfigEntry[];
  mcp_server_name?: string;
  default_config?: {
    permission_policy: { type: string };
  };
}

function installAgentsMockClient(agents: { retrieve: jest.Mock; update?: jest.Mock }) {
  (Anthropic as unknown as jest.Mock).mockReset();
  (Anthropic as unknown as jest.Mock).mockImplementation(() => ({ beta: { agents } }));
}

function getToolsetPayload(updatePayload: {
  tools?: AgentToolsetPayloadEntry[];
}): AgentToolsetPayloadEntry | undefined {
  return updatePayload.tools?.find((t) => t.type === 'agent_toolset_20260401');
}

describe('AnthropicAgentRuntimeProvider.uploadSkill', () => {
  let mockClient: MockClient;
  let provider: AnthropicAgentRuntimeProvider;

  beforeEach(() => {
    mockClient = buildMockClient();
    (Anthropic as unknown as jest.Mock).mockReset();
    (Anthropic as unknown as jest.Mock).mockImplementation(() => mockClient);
    provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('returns the new skillId and version when create succeeds and no existing skill is found', async () => {
      mockClient.beta.skills.list.mockReturnValue(asPagedAsyncIterable([]));
      mockClient.beta.skills.create.mockResolvedValue({ id: 'skill_new', latest_version: 'v1' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_new', version: 'v1' });
      // Proactive lookup always runs once before `create` so the duplicate path
      // is exercised regardless of which source type triggered the upload.
      // We intentionally do NOT pass `{ source: 'custom' }` here — Anthropic's
      // server-side source filter is broken (truncates and lies with
      // `has_more: false`); see provider for the full explanation.
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.list.mock.calls[0][0]).to.deep.equal({
        limit: 100,
        betas: ['skills-2025-10-02'],
      });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(0);

      const createArgs = mockClient.beta.skills.create.mock.calls[0][0];
      expect(createArgs.display_title).to.equal('samber-golang-benchmark');
      expect(createArgs.files).to.have.lengthOf(1);
    });
  });

  describe('proactive lookup — version existing skill', () => {
    it('skips create and pushes a new version when the lookup finds a matching display_title', async () => {
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([
          [
            { id: 'skill_other', display_title: 'something-else', source: 'custom' },
            { id: 'skill_existing', display_title: 'samber-golang-benchmark', source: 'custom' },
          ],
        ])
      );
      mockClient.beta.skills.versions.create.mockResolvedValue({ id: 'sv_17', version: 'v17' });

      const result = await provider.uploadSkill(
        buildInput({
          files: [
            { path: 'SKILL.md', content: Buffer.from(SKILL_MD, 'utf8') },
            { path: 'lib/helpers.py', content: Buffer.from('print("hi")\n', 'utf8') },
          ],
        })
      );

      expect(result).to.deep.equal({ skillId: 'skill_existing', version: 'v17' });

      // The proactive path skips create entirely — both `github-url` and
      // `github-repo` re-uploads converge on the same version-append branch.
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.list.mock.calls[0][0]).to.deep.equal({
        limit: 100,
        betas: ['skills-2025-10-02'],
      });

      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(1);
      const [skillIdArg, paramsArg] = mockClient.beta.skills.versions.create.mock.calls[0];
      expect(skillIdArg).to.equal('skill_existing');
      expect(paramsArg.betas).to.deep.equal(['skills-2025-10-02']);
      // The provider must hand the SDK `<directoryName>/`-prefixed filenames,
      // otherwise the API rejects the bundle as "SKILL.md must be exactly in
      // the top-level folder". `toFile` is stubbed, so this does not cover the
      // SDK's own multipart encoding.
      const fileNames = (paramsArg.files as Array<{ path: string }>).map((file) => file.path);
      expect(fileNames.sort()).to.deep.equal(['my-skill/SKILL.md', 'my-skill/lib/helpers.py']);
    });

    it('walks multiple pages to find the matching display_title', async () => {
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([
          [{ id: 'skill_a', display_title: 'unrelated-a', source: 'custom' }],
          [{ id: 'skill_b', display_title: 'unrelated-b', source: 'custom' }],
          [{ id: 'skill_match', display_title: 'samber-golang-benchmark', source: 'custom' }],
        ])
      );
      mockClient.beta.skills.versions.create.mockResolvedValue({ id: 'sv_42', version: 'v42' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_match', version: 'v42' });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
      expect(mockClient.beta.skills.versions.create.mock.calls[0][0]).to.equal('skill_match');
    });

    it('ignores Anthropic built-ins and falls through to create when the only matching skill has source !== "custom"', async () => {
      // Regression test for the Anthropic source-filter workaround: since we
      // now list unfiltered, built-in skills (`pdf`, `xlsx`, ...) appear in
      // the iterator and we must never try to version-append them.
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([
          [
            { id: 'pdf', display_title: 'samber-golang-benchmark', source: 'anthropic' },
            { id: 'skill_unrelated', display_title: 'something-else', source: 'custom' },
          ],
        ])
      );
      mockClient.beta.skills.create.mockResolvedValue({ id: 'skill_new', latest_version: 'v1' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_new', version: 'v1' });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(0);
    });

    it('surfaces a versions endpoint failure from the proactive path as a bad-request', async () => {
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([[{ id: 'skill_existing', display_title: 'samber-golang-benchmark', source: 'custom' }]])
      );
      const versionBody = { type: 'error', error: { type: 'invalid_request_error', message: 'Bundle malformed' } };
      mockClient.beta.skills.versions.create.mockRejectedValue(
        new APIError(400, versionBody, JSON.stringify(versionBody), undefined as unknown as Headers)
      );

      let thrown: unknown;
      try {
        await provider.uploadSkill(buildInput());
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.be.instanceOf(AgentRuntimeBadRequestError);
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
    });
  });

  describe('race fallback — duplicate error after lookup', () => {
    it('versions the existing skill when create races and a concurrent upload wins', async () => {
      // First list call (proactive): miss. Second list call (race fallback):
      // finds the skill another caller just created.
      mockClient.beta.skills.list
        .mockReturnValueOnce(asPagedAsyncIterable([]))
        .mockReturnValueOnce(
          asPagedAsyncIterable([[{ id: 'skill_existing', display_title: 'samber-golang-benchmark', source: 'custom' }]])
        );
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());
      mockClient.beta.skills.versions.create.mockResolvedValue({ id: 'sv_99', version: 'v99' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_existing', version: 'v99' });
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(2);
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.versions.create.mock.calls[0][0]).to.equal('skill_existing');
    });

    it('re-throws the original duplicate error when neither lookup finds the skill', async () => {
      mockClient.beta.skills.list.mockReturnValue(asPagedAsyncIterable([]));
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());

      let thrown: unknown;
      try {
        await provider.uploadSkill(buildInput());
      } catch (err) {
        thrown = err;
      }

      expect(thrown, 'should reject').to.be.instanceOf(AgentRuntimeBadRequestError);
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(2);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(0);
    });

    it('surfaces a non-duplicate 400 from create directly without a fallback lookup', async () => {
      mockClient.beta.skills.list.mockReturnValue(asPagedAsyncIterable([]));
      // Same APIError shape used in the existing e2e mapping test (see
      // `provider errors` describe in `upload-custom-skill.e2e.ts`).
      const otherBody = {
        type: 'error',
        error: { type: 'invalid_request_error', message: 'Skill name mismatch' },
      };
      mockClient.beta.skills.create.mockRejectedValue(
        new APIError(400, otherBody, JSON.stringify(otherBody), undefined as unknown as Headers)
      );

      let thrown: unknown;
      try {
        await provider.uploadSkill(buildInput());
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.be.instanceOf(AgentRuntimeBadRequestError);
      // Only the proactive lookup ran — the race-fallback lookup is reserved
      // for duplicate-title errors so non-duplicate 400s short-circuit.
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(0);
    });
  });

  describe('preconditions', () => {
    it('throws AgentRuntimeBadRequestError without hitting the SDK when SKILL.md is missing', async () => {
      let thrown: unknown;
      try {
        await provider.uploadSkill(
          buildInput({ files: [{ path: 'README.md', content: Buffer.from('# hi', 'utf8') }] })
        );
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.be.instanceOf(AgentRuntimeBadRequestError);
      // Full SDK-isolation check: neither the proactive lookup (`list`) nor
      // the version-append path (`versions.create`) should run when validation rejects
      // the bundle before any network call.
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(0);
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
      expect(mockClient.beta.skills.versions.create.mock.calls).to.have.lengthOf(0);
    });
  });
});

describe('AnthropicAgentRuntimeProvider.getConfig', () => {
  it('does not map mcp_toolset entries into tools', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

    const retrieve = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: 'You are helpful',
      tools: [
        {
          type: 'agent_toolset_20260401',
          configs: [{ name: 'bash', enabled: true }],
        },
        {
          type: 'mcp_toolset',
          mcp_server_name: 'HubSpot',
        },
      ],
      mcp_servers: [{ name: 'HubSpot', url: 'https://mcp.hubspot.com/mcp' }],
      skills: [],
    });

    installAgentsMockClient({ retrieve });

    const result = await provider.getConfig('ext-agent-id');

    expect(result.tools).to.deep.equal([{ externalId: 'bash', name: 'bash', type: 'builtin' }]);
    expect(result.mcpServers).to.deep.equal([
      { externalId: 'HubSpot', name: 'HubSpot', url: 'https://mcp.hubspot.com/mcp' },
    ]);
  });
});

describe('AnthropicAgentRuntimeProvider.updateConfig', () => {
  it('uses tool externalId (not display name) when serialising the toolset payload', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

    const retrieve = jest.fn().mockResolvedValue({
      version: 1,
      tools: [],
      mcp_servers: [],
      skills: [],
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

    installAgentsMockClient({ retrieve, update });

    const result = await provider.updateConfig('ext-agent-id', {
      tools: [{ externalId: 'bash', name: 'Bash', type: 'builtin' }],
    });

    expect(update.mock.calls).to.have.lengthOf(1);

    const [, updatePayload] = update.mock.calls[0];
    const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });

    expect(toolset, 'toolset payload should be present').to.not.equal(undefined);

    const bashConfig = toolset?.configs?.find((c) => c.name === 'bash');
    expect(bashConfig, 'bash config should be present').to.not.equal(undefined);
    expect(bashConfig?.enabled).to.equal(true);

    const allBuiltinTypes = CLAUDE_BUILTIN_TOOLS.map((t) => t.type);
    const otherToolsDisabled = toolset?.configs
      ?.filter((c) => c.name !== 'bash')
      .every((c) => allBuiltinTypes.includes(c.name) && c.enabled === false);
    expect(otherToolsDisabled).to.equal(true);

    expect(result.tools).to.deep.equal([{ externalId: 'bash', name: 'bash', type: 'builtin' }]);
  });

  it('treats an empty tools array as "disable all tools" by emitting enabled=false for every catalog entry', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

    const retrieve = jest.fn().mockResolvedValue({
      version: 1,
      tools: [
        {
          type: 'agent_toolset_20260401',
          configs: CLAUDE_BUILTIN_TOOLS.map((t) => ({ name: t.type, enabled: true })),
        },
      ],
      mcp_servers: [],
      skills: [],
    });

    const update = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: '',
      tools: [],
      mcp_servers: [],
      skills: [],
    });

    installAgentsMockClient({ retrieve, update });

    await provider.updateConfig('ext-agent-id', { tools: [] });

    const [, updatePayload] = update.mock.calls[0];
    const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });
    const platformTools = (updatePayload as { tools?: AgentToolsetPayloadEntry[] }).tools?.filter(
      (t) => t.type === 'custom'
    );

    expect(toolset?.configs?.every((c) => c.enabled === false)).to.equal(true);
    expect(platformTools?.map((t) => t.name)).to.deep.equal(['novu_tool_catalog', 'novu_resolve', 'novu_human']);
  });

  it('preserves currently-enabled tools (by externalId) when only mcpServers is patched', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

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
      skills: [],
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

    installAgentsMockClient({ retrieve, update });

    await provider.updateConfig('ext-agent-id', {
      mcpServers: [{ externalId: 'Slack', name: 'Slack', url: 'https://mcp.slack.com/mcp' }],
    });

    const [, updatePayload] = update.mock.calls[0];
    const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });

    const enabledNames = toolset?.configs?.filter((c) => c.enabled).map((c) => c.name) ?? [];
    expect(enabledNames).to.include.members(['bash', 'web_search']);
    expect(enabledNames).to.not.include('read');

    const mcpToolset = (updatePayload as { tools?: AgentToolsetPayloadEntry[] }).tools?.find(
      (t) => t.type === 'mcp_toolset'
    );
    expect(mcpToolset?.mcp_server_name).to.equal('Slack');
    expect(mcpToolset?.default_config?.permission_policy).to.deep.equal({ type: 'always_ask' });
  });

  it('force-enables read when attaching skills without rebuilding tools from a tools patch', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

    const retrieve = jest.fn().mockResolvedValue({
      version: 1,
      tools: [
        {
          type: 'agent_toolset_20260401',
          configs: [
            { name: 'web_search', enabled: true },
            { name: 'read', enabled: false },
          ],
        },
      ],
      mcp_servers: [],
      skills: [],
    });

    const update = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: '',
      tools: [],
      mcp_servers: [],
      skills: [{ type: 'anthropic', skill_id: 'pdf', version: null }],
    });

    installAgentsMockClient({ retrieve, update });

    await provider.updateConfig('ext-agent-id', {
      skills: [{ type: 'anthropic', skillId: 'pdf', version: null }],
    });

    const [, updatePayload] = update.mock.calls[0];
    const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });
    const enabledNames = toolset?.configs?.filter((c) => c.enabled).map((c) => c.name) ?? [];

    expect(enabledNames).to.include.members(['web_search', 'read']);
    expect(updatePayload.skills).to.deep.equal([{ type: 'anthropic', skill_id: 'pdf' }]);
  });

  it('force-enables read when tools are patched while skills remain attached', async () => {
    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'test-key' });

    const retrieve = jest.fn().mockResolvedValue({
      version: 1,
      tools: [],
      mcp_servers: [],
      skills: [{ type: 'anthropic', skill_id: 'pdf', version: null }],
    });

    const update = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: '',
      tools: [],
      mcp_servers: [],
      skills: [{ type: 'anthropic', skill_id: 'pdf', version: null }],
    });

    installAgentsMockClient({ retrieve, update });

    await provider.updateConfig('ext-agent-id', {
      tools: [{ externalId: 'web_search', name: 'Web Search', type: 'builtin' }],
    });

    const [, updatePayload] = update.mock.calls[0];
    const toolset = getToolsetPayload(updatePayload as { tools?: AgentToolsetPayloadEntry[] });
    const enabledNames = toolset?.configs?.filter((c) => c.enabled).map((c) => c.name) ?? [];

    expect(enabledNames).to.include.members(['web_search', 'read']);
  });
});
