import { File as NodeFile } from 'node:buffer';
import { APIError } from '@anthropic-ai/sdk';
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
import { AnthropicAgentRuntimeProvider } from './anthropic-agent-runtime.provider';

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

type MockClient = {
  beta: {
    skills: {
      create: jest.Mock;
      list: jest.Mock;
    };
  };
  post: jest.Mock;
};

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

describe('AnthropicAgentRuntimeProvider.uploadSkill', () => {
  let mockClient: MockClient;
  let provider: AnthropicAgentRuntimeProvider;

  beforeEach(() => {
    mockClient = buildMockClient();
    (Anthropic as unknown as jest.Mock).mockReset();
    (Anthropic as unknown as jest.Mock).mockImplementation(() => mockClient);
    provider = new AnthropicAgentRuntimeProvider('test-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('returns the new skillId and version when create succeeds', async () => {
      mockClient.beta.skills.create.mockResolvedValue({ id: 'skill_new', latest_version: 'v1' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_new', version: 'v1' });
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(0);
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);

      const createArgs = mockClient.beta.skills.create.mock.calls[0][0];
      expect(createArgs.display_title).to.equal('samber-golang-benchmark');
      expect(createArgs.files).to.have.lengthOf(1);
    });
  });

  describe('duplicate display_title — auto-version', () => {
    it('looks up the existing skill and pushes a new version via direct client.post', async () => {
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([
          [
            { id: 'skill_other', display_title: 'something-else' },
            { id: 'skill_existing', display_title: 'samber-golang-benchmark' },
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

      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(1);
      expect(mockClient.beta.skills.list.mock.calls[0][0]).to.deep.equal({ source: 'custom' });

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
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([
          [{ id: 'skill_a', display_title: 'unrelated-a' }],
          [{ id: 'skill_b', display_title: 'unrelated-b' }],
          [{ id: 'skill_match', display_title: 'samber-golang-benchmark' }],
        ])
      );
      mockClient.post.mockResolvedValue({ id: 'sv_42', version: 'v42' });

      const result = await provider.uploadSkill(buildInput());

      expect(result).to.deep.equal({ skillId: 'skill_match', version: 'v42' });
      expect(mockClient.post.mock.calls[0][0]).to.equal('/v1/skills/skill_match/versions?beta=true');
    });

    it('re-throws the original duplicate error as a bad-request when no skill matches', async () => {
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([[{ id: 'skill_other', display_title: 'something-else' }]])
      );

      let thrown: unknown;
      try {
        await provider.uploadSkill(buildInput());
      } catch (err) {
        thrown = err;
      }

      expect(thrown, 'should reject').to.be.instanceOf(AgentRuntimeBadRequestError);
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
    });

    it('surfaces a non-duplicate 400 directly without listing or versioning', async () => {
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
      expect(mockClient.beta.skills.list.mock.calls).to.have.lengthOf(0);
      expect(mockClient.post.mock.calls).to.have.lengthOf(0);
    });

    it('surfaces a versions endpoint failure as a bad-request without falling back to a stale skillId', async () => {
      mockClient.beta.skills.create.mockRejectedValue(buildDuplicateDisplayTitleError());
      mockClient.beta.skills.list.mockReturnValue(
        asPagedAsyncIterable([[{ id: 'skill_existing', display_title: 'samber-golang-benchmark' }]])
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
      expect(mockClient.beta.skills.create.mock.calls).to.have.lengthOf(0);
    });
  });
});
