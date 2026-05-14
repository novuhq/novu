import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { UploadSkillFile, UploadSkillInput } from '@novu/application-generic';
import { AgentRuntimeBadRequestError, encryptCredentials } from '@novu/application-generic';
// Stub at the source factory module rather than the barrel: TypeScript's `__exportStar` helper
// installs a non-configurable getter on the package barrel, which `sinon.stub` cannot replace.
// The barrel getter reads the property from this source module on every access, so stubbing
// here transparently propagates to the use-case.
import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { create as createTar } from 'tar';

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

const integrationRepository = new IntegrationRepository();

type ProviderStubs = Partial<Record<string, sinon.SinonStub>>;

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
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter || !frontmatter[1].match(/^[ \t]*name[ \t]*:[ \t]*(.+?)[ \t]*$/m)) {
    throw new AgentRuntimeBadRequestError(
      'SKILL.md must declare a `name` in its YAML frontmatter — Anthropic requires the bundle folder name to match it.',
      AgentRuntimeProviderIdEnum.Anthropic
    );
  }
}

function buildMockProvider(overrides: ProviderStubs = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent-skill' }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent-skill', name: 'agent' }),
    getConfig: sinon
      .stub()
      .resolves({ model: 'claude-sonnet-4-5', systemPrompt: '', mcpServers: [], tools: [] }),
    updateConfig: sinon
      .stub()
      .resolves({ model: 'claude-sonnet-4-5', systemPrompt: '', mcpServers: [], tools: [] }),
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

function buildFetchResponse(body: Buffer, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    arrayBuffer: () =>
      Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
  } as unknown as Response;
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
    sinon.stub(AgentRuntimeFactoryModule, 'getAgentRuntimeProvider').returns(mockProvider as never);
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
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  function stubGithubFetch(buffer: Buffer, status = 200): sinon.SinonStub {
    // Cast through `any` because lib.dom's `fetch` typing on globalThis breaks the
    // `sinon.stub(obj, method)` signature inference in the test compiler config.
    fetchStub = sinon
      .stub(globalThis as unknown as { fetch: typeof fetch }, 'fetch')
      .resolves(buildFetchResponse(buffer, status));

    return fetchStub;
  }

  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('should download the tarball, upload the bundle to the provider, and return the skillId', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const tarball = await buildSkillTarball([
        { path: 'SKILL.md', content: VALID_SKILL_MD },
        { path: 'lib/helpers.py', content: 'print("hi")\n' },
      ]);
      const fetch = stubGithubFetch(tarball);

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github', url: 'https://github.com/anthropics/skills' },
      });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.skillId).to.equal(FAKE_SKILL_ID);

      expect(fetch.calledOnce, 'fetch should be called exactly once').to.be.true;
      const fetchUrl = fetch.getCall(0).args[0] as string;
      expect(fetchUrl).to.match(/^https:\/\/api\.github\.com\/repos\/anthropics\/skills\/tarball\/HEAD/);

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

    it('should extract files scoped to the sub-path and derive the display title from its basename', async () => {
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
          type: 'github',
          url: 'https://github.com/anthropics/skills/tree/main/document-skills/pdf',
        },
      });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.skillId).to.equal(FAKE_SKILL_ID);

      const fetchUrl = fetch.getCall(0).args[0] as string;
      expect(fetchUrl).to.match(/^https:\/\/api\.github\.com\/repos\/anthropics\/skills\/tarball\/main/);

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
        source: { type: 'github', url: 'https://github.com/anthropics/skills' },
      });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.skillId).to.equal(FAKE_SKILL_ID);
      expect(res.body.data.version).to.equal(FAKE_SKILL_VERSION);
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
        source: { type: 'github', url },
      });
      const secondRes = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github', url },
      });

      expect(firstRes.status, JSON.stringify(firstRes.body)).to.equal(201);
      expect(secondRes.status, JSON.stringify(secondRes.body)).to.equal(201);
      expect(firstRes.body.data.skillId).to.equal(existingSkillId);
      expect(secondRes.body.data.skillId).to.equal(existingSkillId);
      expect(firstRes.body.data.version).to.equal('v1');
      expect(secondRes.body.data.version).to.equal('v2');
      expect(mockProvider.uploadSkill.callCount, 'provider.uploadSkill should be called twice').to.equal(2);
    });
  });

  // ─── Integration validation ─────────────────────────────────────────────────

  describe('integration validation', () => {
    it('should return 404 when the integration does not exist', async () => {
      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId: '000000000000000000000099',
        source: { type: 'github', url: 'https://github.com/anthropics/skills' },
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
        source: { type: 'github', url: 'https://github.com/anthropics/skills' },
      });

      expect(res.status).to.equal(422);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });
  });

  // ─── URL validation ─────────────────────────────────────────────────────────

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
          source: { type: 'github', url },
        });

        expect(res.status, `url=${url} -> ${JSON.stringify(res.body)}`).to.equal(400);
        expect(mockProvider.uploadSkill.called, 'uploadSkill must not be reached').to.be.false;
      });
    }
  });

  // ─── Tarball / extraction errors ────────────────────────────────────────────

  describe('extraction errors', () => {
    it('should return 400 when the GitHub tarball endpoint returns 404', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      stubGithubFetch(Buffer.alloc(0), 404);

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github', url: 'https://github.com/some/missing-repo' },
      });

      expect(res.status).to.equal(400);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });

    it('should return 400 when the GitHub tarball endpoint returns a 5xx', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      stubGithubFetch(Buffer.alloc(0), 500);

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github', url: 'https://github.com/foo/bar' },
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
        source: { type: 'github', url: 'https://github.com/foo/bar' },
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
          type: 'github',
          url: 'https://github.com/foo/bar/tree/main/skills/missing',
        },
      });

      expect(res.status).to.equal(400);
      expect(mockProvider.uploadSkill.called).to.be.false;
    });
  });

  // ─── Provider error mapping ─────────────────────────────────────────────────

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
        source: { type: 'github', url: 'https://github.com/foo/bar' },
      });

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');
    });
  });

  // ─── Request body validation ────────────────────────────────────────────────

  describe('request validation', () => {
    it('should return 422 when integrationId is missing', async () => {
      const res = await session.testAgent.post('/v1/agents/skills').send({
        source: { type: 'github', url: 'https://github.com/foo/bar' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when source is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({ integrationId });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when source.type is not "github"', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'gitlab', url: 'https://gitlab.com/foo/bar' },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when source.url is missing', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const res = await session.testAgent.post('/v1/agents/skills').send({
        integrationId,
        source: { type: 'github' },
      });

      expect(res.status).to.equal(422);
    });
  });

  // ─── Inline source ──────────────────────────────────────────────────────────

  describe('inline source', () => {
    describe('happy path', () => {
      it('should wrap the pasted text as a single-file bundle and return the skillId', async () => {
        const integrationId = await createAgentRuntimeIntegration();

        const res = await session.testAgent.post('/v1/agents/skills').send({
          integrationId,
          source: { type: 'inline', content: VALID_SKILL_MD },
        });

        expect(res.status, JSON.stringify(res.body)).to.equal(201);
        expect(res.body.data.skillId).to.equal(FAKE_SKILL_ID);

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
