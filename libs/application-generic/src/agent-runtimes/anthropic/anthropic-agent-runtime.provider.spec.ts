import { File as NodeFile } from 'node:buffer';
import { APIError } from '@anthropic-ai/sdk';
import { CLAUDE_BUILTIN_TOOLS } from '@novu/shared';
import { expect } from 'chai';
import { AgentRuntimeBadRequestError } from '../errors';
import type { UploadSkillInput } from '../i-agent-runtime-provider';

// Polyfill `File` and `FormData` for the auto-version path, which constructs
// `new File(...)` and `new FormData()` when building the multipart body. Jest
// 27's `node` test environment strips Web globals, so we provide just enough
// surface for the provider and these tests.
if (typeof globalThis.File === 'undefined') {
  (globalThis as unknown as { File: typeof NodeFile }).File = NodeFile;
}
if (typeof globalThis.FormData === 'undefined') {
  class MinimalFormData {
    private readonly entries: Array<[string, unknown]> = [];

    append(key: string, value: unknown) {
      this.entries.push([key, value]);
    }

    getAll(key: string): unknown[] {
      return this.entries.filter(([k]) => k === key).map(([, v]) => v);
    }
  }
  (globalThis as unknown as { FormData: typeof MinimalFormData }).FormData = MinimalFormData;
}

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
    };
  };
  post: jest.Mock;
}

function buildMockClient(): MockClient {
  return {
    beta: {
      skills: {
        create: jest.fn(),
        list: jest.fn(),
      },
    },
    post: jest.fn(),
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

function collectFormDataFileNames(body: unknown): string[] {
  if (!(body instanceof FormData)) {
    throw new Error('Expected `body` to be a FormData instance.');
  }

  const names: string[] = [];
  for (const value of body.getAll('files[]')) {
    if (typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string') {
      names.push(value.name);
    }
  }

  return names;
}

interface AgentToolsetConfigEntry {
  name: string;
  enabled: boolean;
}

interface AgentToolsetPayloadEntry {
  type: string;
  configs?: AgentToolsetConfigEntry[];
  mcp_server_name?: string;
  default_config?: {
    permission_policy: { type: string };
  };
}

function installUpdateConfigMockClient(
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
      expect(mockClient.beta.skills.list.mock.calls[0][0]).to.deep.equal({ limit: 100 });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);

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
      mockClient.post.mockResolvedValue({ id: 'sv_17', version: 'v17' });

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
      expect(mockClient.beta.skills.list.mock.calls[0][0]).to.deep.equal({ limit: 100 });

      expect(mockClient.post.mock.calls).to.have.lengthOf(1);
      const [pathArg, optsArg] = mockClient.post.mock.calls[0];
      expect(pathArg).to.equal('/v1/skills/skill_existing/versions?beta=true');
      expect(optsArg.headers).to.deep.equal({ 'anthropic-beta': 'skills-2025-10-02' });
      // Regression check for the @anthropic-ai/sdk@0.95.x bug we work around:
      // the multipart filenames must retain the `<directoryName>/` prefix —
      // otherwise the API rejects the bundle as "SKILL.md must be exactly in
      // the top-level folder" (see provider class comment).
      const fileNames = collectFormDataFileNames(optsArg.body);
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
      mockClient.post.mockResolvedValue({ id: 'sv_42', version: 'v42' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_match', version: 'v42' });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
      expect(mockClient.post.mock.calls[0][0]).to.equal('/v1/skills/skill_match/versions?beta=true');
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
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
    });

    it('surfaces a versions endpoint failure from the proactive path as a bad-request', async () => {
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([[{ id: 'skill_existing', display_title: 'samber-golang-benchmark', source: 'custom' }]])
      );
      const versionBody = { type: 'error', error: { type: 'invalid_request_error', message: 'Bundle malformed' } };
      mockClient.post.mockRejectedValue(
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
      mockClient.post.mockResolvedValue({ id: 'sv_99', version: 'v99' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_existing', version: 'v99' });
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(2);
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.post.mock.calls).to.have.lengthOf(1);
      expect(mockClient.post.mock.calls[0][0]).to.equal('/v1/skills/skill_existing/versions?beta=true');
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
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
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
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
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
      // the version-append path (`post`) should run when validation rejects
      // the bundle before any network call.
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(0);
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
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

    const mockClient = {
      beta: {
        agents: {
          retrieve,
        },
      },
    };

    (provider as unknown as { buildClient: () => unknown }).buildClient = () => mockClient;

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

    installUpdateConfigMockClient(provider, { retrieve, update });

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
    });

    const update = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: '',
      tools: [],
      mcp_servers: [],
      skills: [],
    });

    installUpdateConfigMockClient(provider, { retrieve, update });

    await provider.updateConfig('ext-agent-id', { tools: [] });

    const [, updatePayload] = update.mock.calls[0];
    // With no enabled tools and no mcpServers, buildToolsPayload returns []
    // and we deliberately omit `tools` from the update payload entirely so
    // we don't clear the side the caller didn't touch.
    expect((updatePayload as { tools?: unknown }).tools).to.equal(undefined);
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

    installUpdateConfigMockClient(provider, { retrieve, update });

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
    expect(mcpToolset?.default_config?.permission_policy).to.deep.equal({ type: 'always_allow' });
  });
});
