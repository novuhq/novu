import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { artifactOf, findSkill, skillsIndex } from './agent-skills';
import { readTar } from './tar';

vi.mock('server-only', () => ({}));

/** 117 bytes inside the skill, and more in GitHub's archive: both headers split the path. */
const LONG_REFERENCE = `references/${'a-long-folder-name/'.repeat(5)}commands.md`;

/**
 * The skills repository the tests archive: a skill with references, one that is only its SKILL.md, and one with a
 * quoted description, which YAML would read without its quotes, so the index leaves it out.
 */
const REPOSITORY: Record<string, string> = {
  'README.md': '# Agent Inbox skills\n',
  'skills/agent-inbox/SKILL.md': skillMd('agent-inbox', 'Reaches a real person. Use when nobody is watching.'),
  'skills/agent-inbox/references/cli.md': '# CLI\n',
  [`skills/agent-inbox/${LONG_REFERENCE}`]: '# Commands\n',
  'skills/agent-inbox-mcp/SKILL.md': skillMd(
    'agent-inbox-mcp',
    'Connects an app to the MCP server. Use when adding it.'
  ),
  'skills/quoted/SKILL.md': skillMd('quoted', '"Quoted. Use when testing."'),
};

const CODELOAD = 'https://codeload.github.com/agentinboxhq/skills/tar.gz/';

let folder: string;
let commit: string;
let archive: Buffer;

/** GitHub's archives: the repository's for `main` and for its commit, and nothing for any other ref. */
const fetchArchive = vi.fn(async (url: string) => {
  const ref = url.slice(CODELOAD.length);

  return ref === 'refs/heads/main' || ref === commit
    ? new Response(new Uint8Array(archive))
    : new Response('Not Found', { status: 404 });
});

beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), 'agent-skills-'));
  for (const [path, text] of Object.entries(REPOSITORY)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  git('init', '--quiet', '--initial-branch=main');
  git('add', '--all');
  git('commit', '--quiet', '--message=skills');
  commit = git('rev-parse', 'HEAD').toString().trim();
  // What GitHub serves for a ref: `git archive`, in one folder named after the repository and the ref.
  archive = git('archive', '--format=tar.gz', '--prefix=skills-main/', 'HEAD');
});

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchArchive);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchArchive.mockReset();
});

describe('skillsIndex', () => {
  it('lists each skill with its download under the commit it came from', async () => {
    const index = await skillsIndex();

    expect(index.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json');
    expect(index.skills.map(({ name, type, description, url }) => ({ name, type, description, url }))).toEqual([
      {
        name: 'agent-inbox',
        type: 'archive',
        description: 'Reaches a real person. Use when nobody is watching.',
        url: `/.well-known/agent-skills/${commit}/agent-inbox.tar.gz`,
      },
      {
        name: 'agent-inbox-mcp',
        type: 'skill-md',
        description: 'Connects an app to the MCP server. Use when adding it.',
        url: `/.well-known/agent-skills/${commit}/agent-inbox-mcp/SKILL.md`,
      },
    ]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('leaves out skills/quoted'));
  });

  it('serves each download with the digest the index gives it, holding the skill files', async () => {
    const { skills } = await skillsIndex();

    for (const entry of skills) {
      const skill = await findSkill(commit, entry.name);
      if (!skill) throw new Error(`${entry.name} is missing at ${commit}`);
      const artifact = artifactOf(skill);
      const files =
        entry.type === 'archive' ? readTar(gunzipSync(artifact)).files : [{ path: 'SKILL.md', content: artifact }];

      expect(`sha256:${createHash('sha256').update(artifact).digest('hex')}`).toBe(entry.digest);
      expect(Object.fromEntries(files.map((file) => [file.path, file.content.toString('utf8')]))).toEqual(
        sourceOf(entry.name)
      );
    }
  });

  it('lists no skills while the repository has no main', async () => {
    fetchArchive.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    expect((await skillsIndex()).skills).toEqual([]);
  });

  it('builds without skills when GitHub fails during the build, and fails after the build', async () => {
    fetchArchive.mockImplementation(async () => new Response('', { status: 502 }));

    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    expect((await skillsIndex()).skills).toEqual([]);

    vi.unstubAllEnvs();
    await expect(skillsIndex()).rejects.toThrow('GitHub answered 502');
  });
});

describe('findSkill', () => {
  it('finds nothing for a commit or a skill that GitHub does not have', async () => {
    expect(await findSkill('0'.repeat(40), 'agent-inbox')).toBeNull();
    expect(await findSkill(commit, 'agent-inbox-api')).toBeNull();
  });

  it('never reaches GitHub for a path that cannot name a commit and a skill', async () => {
    expect(await findSkill('main', 'agent-inbox')).toBeNull();
    expect(await findSkill(commit.slice(0, 12), 'agent-inbox')).toBeNull();
    expect(await findSkill(commit, 'Agent_Inbox')).toBeNull();
    expect(fetchArchive).not.toHaveBeenCalled();
  });
});

function git(...args: string[]): Buffer {
  return execFileSync(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args],
    { cwd: folder }
  );
}

function skillMd(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\nlicense: MIT\n---\n\n# ${name}\n`;
}

/** A skill's files in the repository, with paths inside its folder. */
function sourceOf(name: string): Record<string, string> {
  const prefix = `skills/${name}/`;

  return Object.fromEntries(
    Object.entries(REPOSITORY)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, text]) => [path.slice(prefix.length), text])
  );
}
