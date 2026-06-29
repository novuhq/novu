import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { UploadSkillFile, UploadSkillInput } from '@novu/application-generic';
import { AgentRuntimeBadRequestError, encryptCredentials } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { create as createTar } from 'tar';

import { stubResolveAgentRuntime } from './helpers/stub-resolve-agent-runtime';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-skill-e2e';
const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5FakeEnvSkill';
const FAKE_SKILL_ID = 'skill_01XJ5FakeSkill';
const FAKE_SKILL_VERSION = 'v1';

const VALID_SKILL_MD = `---
name: my-pdf-skill
description: A PDF helper skill used in e2e tests.
---

# My PDF Skill

Helpful instructions go here.
`;

function buildSkillMd(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} skill.\n---\n\n# ${name}\n`;
}

const integrationRepository = new IntegrationRepository();

interface ProviderStubs {
  [key: string]: sinon.SinonStub | undefined;
}

/**
 * Replicates the Anthropic provider's real frontmatter check inside the mock so
 * inline e2e cases exercise the actual rejection path end-to-end instead of
 * relying on the stub to "always resolve". Mirrors `extractSkillNameFromBundle`
 * in `anthropic-agent-runtime.provider.ts`.
 */
function validateSkillBundleFrontmatter(files: UploadSkillFile[]): void {
  const skillMd = files.find((f) => f.path === 'SKILL.md');

  if (!skillMd) {
    throw new AgentRuntimeBadRequestError(
      'Skill bundle must contain a SKILL.md file at its root.',
      AgentRuntimeProviderIdEnum.Anthropic
    );
  }

  const content = skillMd.content.toString('utf8').replace(/^\uFEFF/, '');
  // Mirror the ReDoS-safe approach used by `parseSkillNameFromFrontmatter`:
  // a single anchored regex for the frontmatter block, then a per-line
  // string-ops scan for the `name:` key. CodeQL flagged the older single
  // regex (`/^[ \t]*name[ \t]*:[ \t]*(.*)$/m`) under js/polynomial-redos
  // because of its overlapping `[ \t]*` quantifiers.
  const frontmatter = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter || !hasNameKey(frontmatter[1])) {
    throw new AgentRuntimeBadRequestError(
      'SKILL.md must declare a `name` in its YAML frontmatter — Anthropic requires the bundle folder name to match it.',
      AgentRuntimeProviderIdEnum.Anthropic
    );
  }
}

function hasNameKey(frontmatter: string): boolean {
  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.replace(/\r$/, '').replace(/^[ \t]+/, '');

    if (!line.startsWith('name')) {
      continue;
    }

    const afterName = line.slice(4).replace(/^[ \t]+/, '');

    if (afterName.startsWith(':')) {
      return true;
    }
  }

  return false;
}

function buildMockProvider(overrides: ProviderStubs = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent-skill' }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent-skill', name: 'agent' }),
    getConfig: sinon.stub().resolves({ model: 'claude-sonnet-4-5', systemPrompt: '', mcpServers: [], tools: [] }),
    refreshPlatformDefinition: sinon.stub().resolves(undefined),
    updateConfig: sinon.stub().resolves({ model: 'claude-sonnet-4-5', systemPrompt: '', mcpServers: [], tools: [] }),
    provisionIntegration: sinon
      .stub()
      .resolves({ credentialsUpdate: { externalEnvironmentId: FAKE_EXTERNAL_ENV_ID }, metadata: {} }),
    deprovisionIntegration: sinon.stub().resolves(),
    uploadSkill: sinon.stub().callsFake(async (input: UploadSkillInput) => {
      validateSkillBundleFrontmatter(input.files);

      return { skillId: FAKE_SKILL_ID, version: FAKE_SKILL_VERSION };
    }),
    ...overrides,
  };
}

/**
 * Build an in-memory gzipped tar archive that mirrors the layout returned by
 * GitHub's tarball endpoint: a single top-level directory containing the
 * repository contents at the requested ref.
 */
async function buildSkillTarball(
  files: Array<{ path: string; content: string | Buffer }>,
  topDirName = 'owner-repo-abc1234'
): Promise<Buffer> {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'skill-e2e-'));

  try {
    for (const file of files) {
      const filePath = path.join(tempDir, topDirName, file.path);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.content);
    }

    const stream = createTar({ gzip: true, cwd: tempDir }, [topDirName]);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve());
      stream.on('error', (err: Error) => reject(err));
    });

    return Buffer.concat(chunks);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function buildFetchResponse(body: Buffer, status: number, headers?: Record<string, string>): Response {
  return new Response(new Uint8Array(body), { status, headers });
}

describe('POST /v1/agents/skills — upload custom skill #novu-v2', () => {
  let session: UserSession;
  let mockProvider: ReturnType<typeof buildMockProvider>;
  let fetchStub: sinon.SinonStub | null = null;
  const createdIntegrationIds: string[] = [];

  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousManagedRuntimeFlag = process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = 'true';
  });

  after(() => {
    if (previousConversationalAgentsFlag === undefined) {
      delete process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
    } else {
      process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = previousConversationalAgentsFlag;
    }
    if (previousManagedRuntimeFlag === undefined) {
      delete process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;
    } else {
      process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = previousManagedRuntimeFlag;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    mockProvider = buildMockProvider();
    stubResolveAgentRuntime(mockProvider);
    fetchStub = null;
  });

  afterEach(async () => {
    sinon.restore();
    fetchStub = null;

    for (const id of createdIntegrationIds) {
      await integrationRepository.delete({ _id: id, _organizationId: session.organization._id }).catch(() => {});
    }
    createdIntegrationIds.length = 0;
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function createAgentRuntimeIntegration(): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: FAKE_API_KEY },
      active: true,
      name: `anthropic-skill-e2e-${Date.now()}`,
    });

    expect(res.status, `createAgentRuntimeIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    // Fail fast: if the response shape changes and `_id`/`data._id`/`data.id`
    // are all absent, we'd otherwise push `undefined` into the cleanup list
    // and surface as confusing failures in unrelated assertions/cleanup.
    expect(integrationId, `missing integration id in response: ${JSON.stringify(res.body)}`).to.be.a('string');
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  /** Overrides for the `/repos/{owner}/{repo}` pre-check response; defaults to a public 200. */
  type MetadataStubConfig = {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  };

  function stubGithubFetch(
    buffer: Buffer,
    status = 200,
    headers?: Record<string, string>,
    options: { metadata?: MetadataStubConfig } = {}
  ): sinon.SinonStub {
    // Construct a fresh `Response` per invocation: the production code streams
    // `response.body` via `Readable.fromWeb(...)`, which locks the underlying
    // `ReadableStream`. Re-using a single `Response` would cause the second
    // call from any "upload twice" test to fail with "ReadableStream is locked".
    // Cast through `any` because lib.dom's `fetch` typing on globalThis breaks the
    // `sinon.stub(obj, method)` signature inference in the test compiler config.
    fetchStub = sinon
      .stub(globalThis as unknown as { fetch: typeof fetch }, 'fetch')
      .callsFake(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : (input as URL).toString();

        // Match the `/repos/owner/repo` metadata endpoint only — anything
        // with a deeper path (e.g. `/tarball/`) falls through.
        if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+$/.test(url)) {
          const cfg = options.metadata ?? {};
          const body = cfg.body === undefined ? { private: false, visibility: 'public' } : cfg.body;

          return new Response(JSON.stringify(body), {
            status: cfg.status ?? 200,
            headers: { 'Content-Type': 'application/json', ...(cfg.headers ?? {}) },
          });
        }

        return buildFetchResponse(buffer, status, headers);
      });

    return fetchStub;
  }

  /** Locates the tarball call among the recorded `fetch` invocations. */
  function findTarballCall(fetch: sinon.SinonStub): sinon.SinonSpyCall | undefined {
    return fetch.getCalls().find((call) => /\/tarball\//.test(String(call.args[0])));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // github-url source
  // ═══════════════════════════════════════════════════════════════════════════

  describe('github-url source', () => {
    describe('happy path', () => {
      it('should download the tarball, upload the bundle to the provider, and return one skill entry', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'SKILL.md', content: VALID_SKILL_MD },
          { path: 'lib/helpers.py', content: 'print("hi")\n' },
        ]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/anthropics/skills' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.be.an('array').with.length(1);
        expect(res.body.data.skills[0].skillId).to.equal(FAKE_SKILL_ID);
        expect(res.body.data.skills[0].source.type).to.equal('github-url');
        expect(res.body.data.skills[0].source.name).to.equal('my-pdf-skill');

        // Two calls: the public-repo pre-check then the tarball itself.
        expect(fetch.callCount, 'fetch should be called twice (metadata pre-check + tarball)').to.equal(2);
        const tarballCall = findTarballCall(fetch);
        if (!tarballCall) throw new Error('Expected a tarball fetch');
        expect(tarballCall.args[0] as string).to.match(
          /^https:\/\/api\.github\.com\/repos\/anthropics\/skills\/tarball\/HEAD/
        );

        expect(mockProvider.uploadSkill.calledOnce, 'provider.uploadSkill should be called').to.be.true;
        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        expect(uploadArg.displayTitle).to.equal('anthropics-skills');
        expect(uploadArg.files).to.be.an('array').with.length(2);

        const paths = uploadArg.files.map((f: { path: string }) => f.path).sort();
        expect(paths).to.deep.equal(['SKILL.md', 'lib/helpers.py']);

        const skillMd = uploadArg.files.find((f: { path: string }) => f.path === 'SKILL.md');
        expect(Buffer.isBuffer(skillMd.content), 'SKILL.md content should be a Buffer').to.be.true;
        expect(skillMd.content.toString('utf8')).to.equal(VALID_SKILL_MD);
      });

      it('should extract files scoped to the sub-path, derive the display title, and return source.path', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'README.md', content: '# root readme — should be excluded' },
          { path: 'document-skills/pdf/SKILL.md', content: VALID_SKILL_MD },
          { path: 'document-skills/pdf/lib/helpers.py', content: 'pass\n' },
          { path: 'document-skills/other/SKILL.md', content: 'unrelated — should be excluded' },
        ]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: {
            type: 'github-url',
            url: 'https://github.com/anthropics/skills/tree/main/document-skills/pdf',
          },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.have.length(1);
        expect(res.body.data.skills[0].skillId).to.equal(FAKE_SKILL_ID);
        expect(res.body.data.skills[0].source).to.deep.include({
          type: 'github-url',
          path: 'document-skills/pdf',
          name: 'my-pdf-skill',
        });

        const tarballCall = findTarballCall(fetch);
        if (!tarballCall) throw new Error('Expected a tarball fetch');
        expect(tarballCall.args[0] as string).to.match(
          /^https:\/\/api\.github\.com\/repos\/anthropics\/skills\/tarball\/main/
        );

        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        expect(uploadArg.displayTitle).to.equal('anthropics-pdf');

        const paths = uploadArg.files.map((f: { path: string }) => f.path).sort();
        expect(paths, 'only files inside the sub-path should be included').to.deep.equal([
          'SKILL.md',
          'lib/helpers.py',
        ]);
      });

      it('should surface the version returned by the provider in the response', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/anthropics/skills' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills[0].skillId).to.equal(FAKE_SKILL_ID);
        expect(res.body.data.skills[0].version).to.equal(FAKE_SKILL_VERSION);
      });

      it('should treat a re-upload as success when the provider returns an existing skillId with a new version', async () => {
        // Simulate the auto-version-on-collision result from the Anthropic
        // provider: re-uploading the same source returns the same stable
        // skillId paired with a freshly-bumped version on each call.
        const existingSkillId = 'skill_existing_e2e';
        mockProvider.uploadSkill = sinon
          .stub()
          .onFirstCall()
          .resolves({ skillId: existingSkillId, version: 'v1' })
          .onSecondCall()
          .resolves({ skillId: existingSkillId, version: 'v2' });

        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const url = 'https://github.com/anthropics/skills';

        stubGithubFetch(tarball);

        const firstRes = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url },
        });
        const secondRes = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url },
        });

        expect(firstRes.status, JSON.stringify(firstRes.body)).to.equal(201);
        expect(secondRes.status, JSON.stringify(secondRes.body)).to.equal(201);
        expect(firstRes.body.data.skills[0].skillId).to.equal(existingSkillId);
        expect(secondRes.body.data.skills[0].skillId).to.equal(existingSkillId);
        expect(firstRes.body.data.skills[0].version).to.equal('v1');
        expect(secondRes.body.data.skills[0].version).to.equal('v2');
        expect(mockProvider.uploadSkill.callCount, 'provider.uploadSkill should be called twice').to.equal(2);
      });
    });

    describe('URL validation', () => {
      const cases: Array<{ name: string; url: string }> = [
        { name: 'non-github host', url: 'https://example.com/foo/bar' },
        { name: 'insecure http scheme', url: 'http://github.com/foo/bar' },
        { name: 'malformed URL', url: 'not-a-url' },
        { name: 'missing repository segment', url: 'https://github.com/foo' },
        { name: 'unsupported sub-resource (wiki)', url: 'https://github.com/foo/bar/wiki/Home' },
        { name: 'tree path missing a ref', url: 'https://github.com/foo/bar/tree' },
      ];

      for (const { name, url } of cases) {
        it(`should return 400 for a ${name}`, async () => {
          const integrationId = await createAgentRuntimeIntegration();

          const res = await session.testAgent.post('/v1/agents/skills').send({
            integrationId,
            source: { type: 'github-url', url },
          });

          expect(res.status, `url=${url} -> ${JSON.stringify(res.body)}`).to.equal(400);
          expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
        });
      }
    });

    // Refuses to download a tarball unless `/repos/owner/repo` reports the
    // target as unambiguously public. Without this, an over-scoped server
    // token could be abused to fetch private repos.
    describe('public repository guard', () => {
      it('should return 400 when the repository metadata reports private: true', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball, 200, undefined, {
          metadata: { body: { private: true, visibility: 'private' } },
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/private' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(String(res.body.message ?? '')).to.match(/not publicly accessible/i);
        expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
        expect(findTarballCall(fetch), 'tarball must not be fetched for private repos').to.be.undefined;
      });

      it('should return 400 when the repository visibility is "internal"', async () => {
        // GHE "internal" repos report `private: false` but aren't publicly
        // readable — the guard must reject on `visibility` too.
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball, 200, undefined, {
          metadata: { body: { private: false, visibility: 'internal' } },
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/internal' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(String(res.body.message ?? '')).to.match(/not publicly accessible/i);
        expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
        expect(findTarballCall(fetch), 'tarball must not be fetched for internal repos').to.be.undefined;
      });

      it('should return 400 with a unified message when the metadata endpoint returns 404', async () => {
        // Unified message across "missing" and "private" so error strings
        // can't be used to enumerate private repos.
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball, 200, undefined, {
          metadata: { status: 404, body: { message: 'Not Found' } },
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/missing' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(String(res.body.message ?? '')).to.match(/not publicly accessible or does not exist/i);
        expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
        expect(findTarballCall(fetch), 'tarball must not be fetched on metadata 404').to.be.undefined;
      });

      it('should return 400 when the metadata response body cannot be parsed', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        // Custom stub: 200 with non-JSON metadata body to hit the parse branch.
        fetchStub = sinon
          .stub(globalThis as unknown as { fetch: typeof fetch }, 'fetch')
          .callsFake(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : (input as URL).toString();

            if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+$/.test(url)) {
              return new Response('not-json-at-all', { status: 200 });
            }

            return buildFetchResponse(tarball, 200);
          });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
        expect(findTarballCall(fetchStub), 'tarball must not be fetched on malformed metadata').to.be.undefined;
      });

      it('should hit the metadata endpoint before the tarball endpoint', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(fetch.callCount, 'fetch should be called twice (metadata + tarball)').to.equal(2);

        const firstUrl = String(fetch.getCall(0).args[0]);
        const secondUrl = String(fetch.getCall(1).args[0]);
        expect(firstUrl, 'metadata pre-check must run before tarball').to.match(
          /^https:\/\/api\.github\.com\/repos\/foo\/bar$/
        );
        expect(secondUrl).to.match(/\/tarball\//);
      });
    });

    describe('extraction errors', () => {
      it('should return 400 when the GitHub tarball endpoint returns 404', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 404);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/some/missing-repo' },
        });

        expect(res.status).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 when the GitHub tarball endpoint returns a 5xx', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 500);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status).to.equal(400);
      });

      it('should return 400 when the bundle has no SKILL.md at its root', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'README.md', content: '# Hello' },
          { path: 'lib/helpers.py', content: 'pass\n' },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 when the sub-path has no files inside the tarball', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: {
            type: 'github-url',
            url: 'https://github.com/foo/bar/tree/main/skills/missing',
          },
        });

        expect(res.status).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });
    });

    describe('provider errors', () => {
      it('should map AgentRuntimeBadRequestError from the provider to a 400 with AGENT_RUNTIME_BAD_REQUEST', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        stubGithubFetch(tarball);

        mockProvider.uploadSkill.rejects(
          new AgentRuntimeBadRequestError('Skill name mismatch', AgentRuntimeProviderIdEnum.Anthropic)
        );

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');
      });
    });

    describe('per-file size cap', () => {
      it('should silently skip files larger than the per-file size cap', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        // 2 MB exceeds the 1 MB per-file cap; the SKILL.md still passes through.
        const oversized = Buffer.alloc(2 * 1024 * 1024, 'x');
        const tarball = await buildSkillTarball([
          { path: 'SKILL.md', content: VALID_SKILL_MD },
          { path: 'huge-asset.bin', content: oversized },
          { path: 'small.txt', content: 'still in\n' },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        const paths = uploadArg.files.map((f: { path: string }) => f.path).sort();
        expect(paths, 'oversized file should be skipped').to.deep.equal(['SKILL.md', 'small.txt']);
      });

      it('should silently skip entries inside well-known noisy directories', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'SKILL.md', content: VALID_SKILL_MD },
          { path: 'node_modules/junk/index.js', content: 'module.exports = {};\n' },
          { path: 'dist/output.js', content: 'console.log("nope");\n' },
          { path: 'lib/keep.py', content: 'pass\n' },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        const paths = uploadArg.files.map((f: { path: string }) => f.path).sort();
        expect(paths, 'node_modules and dist entries should be skipped').to.deep.equal(['SKILL.md', 'lib/keep.py']);
      });
    });

    describe('authentication', () => {
      const previousGithubToken = process.env.GITHUB_API_TOKEN;

      afterEach(() => {
        if (previousGithubToken === undefined) {
          delete process.env.GITHUB_API_TOKEN;
        } else {
          process.env.GITHUB_API_TOKEN = previousGithubToken;
        }
      });

      it('should send a Bearer Authorization header when GITHUB_API_TOKEN is set', async () => {
        process.env.GITHUB_API_TOKEN = 'ghp_test_token';
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        // Assert against the tarball call specifically — it's the security-
        // relevant fetch; the loop below covers the metadata call too.
        const tarballCall = findTarballCall(fetch);
        if (!tarballCall) throw new Error('Expected a tarball fetch');
        const tarballHeaders = (tarballCall.args[1] as RequestInit).headers as Record<string, string>;
        expect(tarballHeaders.Authorization, 'tarball request should carry the bearer token').to.equal(
          'Bearer ghp_test_token'
        );

        for (const call of fetch.getCalls()) {
          const callHeaders = (call.args[1] as RequestInit).headers as Record<string, string>;
          expect(callHeaders.Authorization, 'every GitHub call should use the same auth header').to.equal(
            'Bearer ghp_test_token'
          );
        }
      });

      it('should NOT send an Authorization header when GITHUB_API_TOKEN is unset', async () => {
        delete process.env.GITHUB_API_TOKEN;
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'SKILL.md', content: VALID_SKILL_MD }]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        for (const call of fetch.getCalls()) {
          const callHeaders = (call.args[1] as RequestInit).headers as Record<string, string>;
          expect(callHeaders.Authorization, 'no GitHub call should set an auth header without a token').to.equal(
            undefined
          );
        }
      });
    });

    describe('rate limiting', () => {
      it('should return 400 with a "rate limit exceeded" message on 403 + x-ratelimit-remaining: 0', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 403, {
          'x-ratelimit-remaining': '0',
          'retry-after': '60',
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        const message = String(res.body.message ?? '');
        expect(message).to.match(/rate limit exceeded/i);
        expect(message).to.match(/60s/);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 with a "rate limit exceeded" message on 429', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 429, {
          'retry-after': '30',
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        const message = String(res.body.message ?? '');
        expect(message).to.match(/rate limit exceeded/i);
        expect(message).to.match(/30s/);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should treat 403 without x-ratelimit-remaining: 0 as a generic HTTP error', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 403, {
          'x-ratelimit-remaining': '4999',
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-url', url: 'https://github.com/foo/bar' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        const message = String(res.body.message ?? '');
        expect(message, 'should not be mapped as rate limit').to.not.match(/rate limit exceeded/i);
        expect(message).to.match(/HTTP 403/);
      });
    });
  });

  // ─── Integration validation (cross-variant) ─────────────────────────────────

  describe('integration validation', () => {
    it('should return 404 when the integration does not exist', async () => {
      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId: '000000000000000000000099',
        source: { type: 'github-url', url: 'https://github.com/anthropics/skills' },
      });

      expect(res.status).to.equal(404);
      expect(mockProvider.uploadSkill.called, 'uploadSkill should not be called').to.be.false;
    });

    it('should return 422 when the integration has no API key configured', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      await integrationRepository.update(
        { _id: integrationId, _organizationId: session.organization._id },
        { $set: { credentials: encryptCredentials({ externalEnvironmentId: FAKE_EXTERNAL_ENV_ID }) } }
      );

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-url', url: 'https://github.com/anthropics/skills' },
      });

      expect(res.status).to.equal(422);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });
  });

  // ─── Request body validation (cross-variant) ────────────────────────────────

  describe('request validation', () => {
    it('should return 422 when integrationId is missing', async () => {
      const res = await session.testAgent.post('/v1/agents/skills').send({
        source: { type: 'github-url', url: 'https://github.com/foo/bar' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when source is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({ integrationId });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when source.type is unknown', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'gitlab', url: 'https://gitlab.com/foo/bar' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when github-url source.url is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-url' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when github-repo source.repo is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-repo' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when github-repo source.skills is not an array', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-repo', repo: 'owner/repo', skills: 'not-an-array' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when github-repo source.skills is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-repo', repo: 'owner/repo' },
      });

      expect(res.status).to.equal(422);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });

    it('should return 422 when github-repo source.skills is an empty array', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github-repo', repo: 'owner/repo', skills: [] },
      });

      expect(res.status).to.equal(422);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // github-repo source
  // ═══════════════════════════════════════════════════════════════════════════

  describe('github-repo source', () => {
    describe('happy path', () => {
      it('should upload a single named skill, returning one entry with source.path populated', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'README.md', content: '# root' },
          { path: 'skills/golang-benchmark/SKILL.md', content: buildSkillMd('golang-benchmark') },
          { path: 'skills/golang-benchmark/lib/helpers.py', content: 'pass\n' },
          { path: 'skills/golang-fmt/SKILL.md', content: buildSkillMd('golang-fmt') },
        ]);
        const fetch = stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: {
            type: 'github-repo',
            repo: 'samber/cc-skills-golang',
            skills: ['golang-benchmark'],
          },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.have.length(1);
        expect(res.body.data.skills[0].source).to.deep.include({
          type: 'github-repo',
          path: 'skills/golang-benchmark',
          name: 'golang-benchmark',
        });

        const tarballCall = findTarballCall(fetch);
        if (!tarballCall) throw new Error('Expected a tarball fetch');
        expect(tarballCall.args[0] as string).to.match(
          /^https:\/\/api\.github\.com\/repos\/samber\/cc-skills-golang\/tarball\/HEAD/
        );

        expect(mockProvider.uploadSkill.callCount).to.equal(1);
        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        expect(uploadArg.displayTitle).to.equal('samber-golang-benchmark');
        const paths = uploadArg.files.map((f: { path: string }) => f.path).sort();
        expect(paths).to.deep.equal(['SKILL.md', 'lib/helpers.py']);
      });

      it('should upload multiple named skills in input order', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'skills/golang-benchmark/SKILL.md', content: buildSkillMd('golang-benchmark') },
          { path: 'skills/golang-fmt/SKILL.md', content: buildSkillMd('golang-fmt') },
          { path: 'skills/golang-vet/SKILL.md', content: buildSkillMd('golang-vet') },
        ]);
        stubGithubFetch(tarball);

        mockProvider.uploadSkill = sinon.stub().callsFake(async (input: UploadSkillInput) => {
          validateSkillBundleFrontmatter(input.files);
          return { skillId: `skill_${input.displayTitle}`, version: 'v1' };
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: {
            type: 'github-repo',
            repo: 'samber/cc-skills-golang',
            skills: ['golang-vet', 'golang-benchmark', 'golang-fmt'],
          },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.have.length(3);
        const orderedPaths = res.body.data.skills.map((s: { source: { path: string } }) => s.source.path);
        expect(orderedPaths).to.deep.equal(['skills/golang-vet', 'skills/golang-benchmark', 'skills/golang-fmt']);
        expect(mockProvider.uploadSkill.callCount).to.equal(3);
      });

      it('should silently dedupe repeated names in `skills`', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'skills/a/SKILL.md', content: buildSkillMd('a') },
          { path: 'skills/b/SKILL.md', content: buildSkillMd('b') },
        ]);
        stubGithubFetch(tarball);

        mockProvider.uploadSkill = sinon.stub().callsFake(async (input: UploadSkillInput) => {
          validateSkillBundleFrontmatter(input.files);
          return { skillId: `skill_${input.displayTitle}`, version: 'v1' };
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'owner/repo', skills: ['a', 'a', 'b'] },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.have.length(2);
      });
    });

    describe('repo slug validation', () => {
      const invalidRepos = [
        'samber',
        'samber/',
        '/cc-skills',
        'samber//cc-skills',
        'samber/cc skills',
        'samber/cc-skills/extra',
        'https://github.com/samber/cc-skills',
        'samber/../malicious',
        'sam ber/skills',
      ];

      for (const repo of invalidRepos) {
        it(`should return 400 for invalid repo slug "${repo}"`, async () => {
          const integrationId = await createAgentRuntimeIntegration();

          const res = await session.testAgent.post('/v1/agents/skills').send({
            integrationId,
            source: { type: 'github-repo', repo, skills: ['placeholder'] },
          });

          expect(res.status, `repo=${repo} -> ${JSON.stringify(res.body)}`).to.equal(400);
          expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
        });
      }
    });

    describe('discovery errors', () => {
      it('should return 400 when no SKILL.md is found anywhere in the repository', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'README.md', content: '# nothing here' },
          { path: 'src/main.go', content: 'package main\n' },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'owner/repo', skills: ['anything'] },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 listing available skills when a requested basename is not found', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'skills/golang-benchmark/SKILL.md', content: buildSkillMd('golang-benchmark') },
          { path: 'skills/golang-fmt/SKILL.md', content: buildSkillMd('golang-fmt') },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: {
            type: 'github-repo',
            repo: 'owner/repo',
            skills: ['totally-missing-skill'],
          },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        const message = String(res.body.message ?? '');
        expect(message).to.match(/totally-missing-skill/);
        expect(message).to.match(/golang-benchmark/);
        expect(message).to.match(/golang-fmt/);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 listing conflicting paths when a basename is ambiguous', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'document-skills/pdf/SKILL.md', content: buildSkillMd('pdf-a') },
          { path: 'creative-skills/pdf/SKILL.md', content: buildSkillMd('pdf-b') },
        ]);
        stubGithubFetch(tarball);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'owner/repo', skills: ['pdf'] },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        const message = String(res.body.message ?? '');
        expect(message).to.match(/document-skills\/pdf/);
        expect(message).to.match(/creative-skills\/pdf/);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 400 when the GitHub tarball endpoint returns 404 for a github-repo upload', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        stubGithubFetch(Buffer.alloc(0), 404);

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'owner/missing', skills: ['anything'] },
        });

        expect(res.status).to.equal(400);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should also enforce the public repository guard for github-repo uploads', async () => {
        // The guard lives in shared `streamTarballToParser`; pin the
        // `github-repo` variant so it can't regress independently.
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([{ path: 'skills/foo/SKILL.md', content: buildSkillMd('foo') }]);
        const fetch = stubGithubFetch(tarball, 200, undefined, {
          metadata: { body: { private: true, visibility: 'private' } },
        });

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'foo/private', skills: ['foo'] },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(String(res.body.message ?? '')).to.match(/not publicly accessible/i);
        expect(mockProvider.uploadSkill.called).to.be.false;
        expect(findTarballCall(fetch), 'tarball must not be fetched for private repos').to.be.undefined;
      });
    });

    describe('partial failure', () => {
      it('should abort the batch on the first per-skill failure and NOT roll back earlier successes', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const tarball = await buildSkillTarball([
          { path: 'skills/a/SKILL.md', content: buildSkillMd('a') },
          { path: 'skills/b/SKILL.md', content: buildSkillMd('b') },
          { path: 'skills/c/SKILL.md', content: buildSkillMd('c') },
        ]);
        stubGithubFetch(tarball);

        const uploadStub = sinon
          .stub()
          .onFirstCall()
          .resolves({ skillId: 'skill_first', version: 'v1' })
          .onSecondCall()
          .rejects(
            new AgentRuntimeBadRequestError('intentional mid-batch failure', AgentRuntimeProviderIdEnum.Anthropic)
          )
          .onThirdCall()
          .resolves({ skillId: 'skill_third_should_not_be_used', version: 'v1' });

        mockProvider.uploadSkill = uploadStub;

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'github-repo', repo: 'owner/repo', skills: ['a', 'b', 'c'] },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');

        expect(uploadStub.callCount, 'uploadSkill should be called exactly twice (1st success + 2nd failure)').to.equal(
          2
        );
        // No rollback path exists; the provider stub never sees a delete call because we don't expose one.
        expect(mockProvider.deleteAgent.called, 'no rollback delete should be issued').to.be.false;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // inline source
  // ═══════════════════════════════════════════════════════════════════════════

  describe('inline source', () => {
    describe('happy path', () => {
      it('should wrap the pasted text as a single-file bundle and return one skill entry', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: VALID_SKILL_MD },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skills).to.have.length(1);
        expect(res.body.data.skills[0].skillId).to.equal(FAKE_SKILL_ID);
        expect(res.body.data.skills[0].source).to.deep.include({
          type: 'inline',
          name: 'my-pdf-skill',
        });
        expect(res.body.data.skills[0].source.path).to.be.oneOf([undefined, null]);

        // The inline path never hits the network — guard against accidental fetch calls.
        expect(fetchStub, 'fetch should not be stubbed/called for inline source').to.equal(null);

        expect(mockProvider.uploadSkill.calledOnce, 'provider.uploadSkill should be called').to.be.true;
        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        expect(uploadArg.files).to.be.an('array').with.length(1);
        expect(uploadArg.files[0].path).to.equal('SKILL.md');
        expect(Buffer.isBuffer(uploadArg.files[0].content), 'SKILL.md content should be a Buffer').to.be.true;
        expect(uploadArg.files[0].content.toString('utf8')).to.equal(VALID_SKILL_MD);
      });

      it('should derive displayTitle from the frontmatter name field', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: VALID_SKILL_MD },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);

        const uploadArg = mockProvider.uploadSkill.getCall(0).args[0];
        expect(uploadArg.displayTitle).to.equal('my-pdf-skill');
      });
    });

    describe('frontmatter validation', () => {
      it('should return 400 when the pasted content lacks YAML frontmatter', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: '# My Skill\n\nNo frontmatter here.\n' },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        // The inline bundle reached the provider, which rejected on missing frontmatter.
        expect(mockProvider.uploadSkill.calledOnce, 'uploadSkill should be invoked exactly once').to.be.true;
      });

      it('should return 400 when the frontmatter has no `name` field', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const contentWithoutName = `---
description: A skill without a name field.
---

# Body
`;

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: contentWithoutName },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(400);
        expect(mockProvider.uploadSkill.calledOnce, 'uploadSkill should be invoked exactly once').to.be.true;
      });
    });

    describe('request validation', () => {
      it('should return 422 when source.content is missing', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline' },
        });

        expect(res.status).to.equal(422);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 422 when source.content is an empty string', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: '' },
        });

        expect(res.status).to.equal(422);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });

      it('should return 422 when source.content exceeds the 256 KB length cap', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        // 256 KB + 1 char — one past the @MaxLength bound.
        const oversized = `${VALID_SKILL_MD}${'x'.repeat(256 * 1024 + 1 - VALID_SKILL_MD.length)}`;

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: oversized },
        });

        expect(res.status).to.equal(422);
        expect(mockProvider.uploadSkill.called).to.be.false;
      });
    });

    describe('integration validation', () => {
      it('should return 404 when the integration does not exist (parity with github)', async () => {
        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId: '000000000000000000000099',
          source: { type: 'inline', content: VALID_SKILL_MD },
        });

        expect(res.status).to.equal(404);
        expect(mockProvider.uploadSkill.called, 'uploadSkill should not be called').to.be.false;
      });
    });
  });
});
