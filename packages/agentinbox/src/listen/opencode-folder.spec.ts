import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Rule } from './opencode';
import {
  contactConfigContent,
  contactSessionRules,
  decideOpenCodeCall,
  effectOf,
  fitsPattern,
  folderSessionRules,
  type OpenCodeFolder,
  parseJsonc,
  readOpenCodeFolder,
} from './opencode-folder';

let dir: string;
let home: string;
let repo: string;
let project: string;

beforeEach(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'opencode-folder-')));
  home = join(dir, 'home');
  repo = join(home, 'work', 'repo');
  project = join(repo, 'app');
  mkdirSync(join(repo, '.git'), { recursive: true });
  mkdirSync(project, { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** The last rule that fits decides, as OpenCode goes by them. */
function decide(rules: readonly Rule[], name: string, pattern: string): Rule['effect'] | undefined {
  return effectOf(rules, name, [pattern]);
}

describe('readOpenCodeFolder', () => {
  it('reads the folder’s own settings up to its git root, both ways OpenCode writes rules, never the home folder’s', () => {
    writeFileSync(join(home, 'opencode.json'), JSON.stringify({ permission: { bash: 'allow' } }));
    writeFileSync(
      join(repo, 'opencode.jsonc'),
      `{
        // The repository's own.
        "permission": { "bash": { "git status": "allow", "git push": "ask" }, "edit": "deny" },
        "mcp": { "docs": { "type": "local", "command": ["docs-mcp"] }, "off": { "type": "local", "enabled": false } },
      }`
    );
    mkdirSync(join(project, '.opencode'), { recursive: true });
    writeFileSync(
      join(project, '.opencode', 'opencode.json'),
      JSON.stringify({
        permissions: [{ action: 'read', resource: 'docs/*', effect: 'allow' }],
        tools: { webfetch: false },
        agent: { build: { permission: { websearch: 'ask' } } },
      })
    );

    expect(readOpenCodeFolder(project, 2, home)).toEqual({
      project,
      rules: [
        { name: 'shell', pattern: 'git status', effect: 'allow' },
        { name: 'shell', pattern: 'git push', effect: 'ask' },
        { name: 'edit', pattern: '*', effect: 'deny' },
        { name: 'read', pattern: 'docs/*', effect: 'allow' },
        { name: 'webfetch', pattern: '*', effect: 'deny' },
        { name: 'websearch', pattern: '*', effect: 'ask' },
      ],
      skills: [],
      servers: ['docs'],
      guard: { home, places: [join(home, '.agentinbox')], links: [] },
    });
    expect(readOpenCodeFolder(project, 1, home).rules[0]).toEqual({
      name: 'bash',
      pattern: 'git status',
      effect: 'allow',
    });
  });

  it('leaves out rules that name no tool, and an MCP server’s that isn’t the folder’s, but keeps every deny', () => {
    writeFileSync(
      join(project, 'opencode.json'),
      JSON.stringify({
        permission: {
          '*': 'allow',
          '*_*': 'allow',
          docs_search: 'allow',
          github_create_issue: 'allow',
          github_delete_repo: 'deny',
        },
        mcp: { docs: { type: 'local', command: ['docs-mcp'] } },
      })
    );
    writeFileSync(join(repo, 'opencode.json'), JSON.stringify({ permission: 'allow' }));

    expect(readOpenCodeFolder(project, 2, home).rules).toEqual([
      { name: 'docs_search', pattern: '*', effect: 'allow' },
      { name: 'github_delete_repo', pattern: '*', effect: 'deny' },
    ]);
  });

  it('finds the folder’s skills by the names they give themselves', () => {
    for (const [place, name] of [
      ['.opencode/skills/hello', 'name: hello'],
      ['.claude/skills/review', 'name: "code-review"'],
      ['.agents/skills/plain', ''],
    ] as const) {
      mkdirSync(join(project, place), { recursive: true });
      writeFileSync(join(project, place, 'SKILL.md'), `---\n${name}\ndescription: A skill.\n---\nDo it.\n`);
    }

    expect(readOpenCodeFolder(project, 2, home).skills).toEqual(['hello', 'code-review', 'plain']);
  });

  it('says nothing when the folder has no settings of its own, or settings it can’t read', () => {
    writeFileSync(join(project, 'opencode.json'), '{ not json');

    expect(readOpenCodeFolder(project, 2, home)).toEqual({
      project,
      rules: [],
      skills: [],
      servers: [],
      guard: { home, places: [join(home, '.agentinbox')], links: [] },
    });
  });
});

describe('contactSessionRules', () => {
  const folder: OpenCodeFolder = {
    project: '/work/app',
    rules: [
      { name: 'shell', pattern: 'git *', effect: 'allow' },
      { name: 'edit', pattern: '*', effect: 'allow' },
      { name: 'read', pattern: '*', effect: 'allow' },
      { name: 'shell', pattern: 'npm publish', effect: 'ask' },
      { name: 'webfetch', pattern: 'https://docs.example.com/*', effect: 'allow' },
    ],
    skills: ['hello'],
    servers: [],
    guard: { home: '/Users/ada', places: ['/Users/ada/.agentinbox', '/work/app/inbox.json'], links: [] },
  };

  it('refuses everything the folder’s rules don’t allow, and goes by them', () => {
    const rules = folderSessionRules(2, folder);

    expect(rules[0]).toEqual({ name: '*', pattern: '*', effect: 'deny' });
    expect(decide(rules, 'shell', 'git status')).toBe('allow');
    expect(decide(rules, 'shell', 'npm publish')).toBe('ask');
    expect(decide(rules, 'shell', 'rm -rf build')).toBe('deny');
    expect(decide(rules, 'webfetch', 'https://example.com')).toBe('deny');
    expect(decide(rules, 'github_create_issue', '*')).toBe('deny');
  });

  it('has OpenCode ask the listener about the files and commands the folder allows, and nothing else', () => {
    const rules = contactSessionRules(2, folder);

    expect(decide(rules, 'shell', 'git status')).toBe('ask');
    expect(decide(rules, 'read', 'src/index.ts')).toBe('ask');
    expect(decide(rules, 'edit', 'src/index.ts')).toBe('ask');
    expect(decide(rules, 'shell', 'rm -rf build')).toBe('deny');
    expect(decide(rules, 'webfetch', 'https://docs.example.com/a')).toBe('allow');
  });

  it('lets the folder’s skills, questions to the person and its own conversation tools through', () => {
    const rules = contactSessionRules(2, folder);

    expect(decide(rules, 'skill', 'hello')).toBe('allow');
    expect(decide(rules, 'skill', 'deploy')).toBe('deny');
    expect(decide(rules, 'question', '*')).toBe('allow');
    expect(decide(rules, 'this_conversation_read', '*')).toBe('allow');
    expect(decide(rules, 'this_conversation_resolve', '*')).toBe('allow');
  });

  it('goes by the folder’s rules for a skill they name', () => {
    const rules = contactSessionRules(2, {
      ...folder,
      rules: [
        { name: 'skill', pattern: 'deploy', effect: 'deny' },
        { name: 'skill', pattern: 'review', effect: 'ask' },
      ],
      skills: ['hello', 'deploy', 'review'],
    });

    expect(decide(rules, 'skill', 'hello')).toBe('allow');
    expect(decide(rules, 'skill', 'deploy')).toBe('deny');
    expect(decide(rules, 'skill', 'review')).toBe('ask');
  });

  it('keeps the key closed, whatever a rule names, and the file INBOX_CONFIG points at too', () => {
    const rules = contactSessionRules(2, folder);

    expect(decide(rules, 'read', '/Users/ada/.agentinbox/config.json')).toBe('deny');
    expect(decide(rules, 'read', '/work/app/inbox.json')).toBe('deny');
    expect(decide(rules, 'shell', 'git show HEAD:../.agentinbox/config.json')).toBe('deny');
    expect(decide(rules, 'shell', 'git config --get INBOX_CONFIG')).toBe('deny');
    // Not even a rule that names it opens it, nor one for something else in its folder.
    const naming = contactSessionRules(2, {
      ...folder,
      rules: [
        { name: 'read', pattern: '*', effect: 'allow' },
        { name: 'read', pattern: '/Users/ada/.agentinbox/*', effect: 'allow' },
        { name: 'read', pattern: '/Users/ada/.agentinbox/notes.txt', effect: 'ask' },
      ],
    });
    expect(decide(naming, 'read', '/Users/ada/.agentinbox/config.json')).toBe('deny');
    expect(decide(naming, 'read', '/Users/ada/.agentinbox/notes.txt')).toBe('deny');
  });

  it('refuses changes to what decides a run, whatever allows them', () => {
    const rules = folderSessionRules(2, folder);

    for (const path of ['opencode.json', '/work/app/.opencode/agents/x.md', 'AGENTS.md', '.git/hooks/pre-commit']) {
      expect(decide(rules, 'edit', path)).toBe('deny');
    }
    expect(decide(rules, 'edit', 'src/index.ts')).toBe('allow');
    expect(decide(rules, 'shell', 'git add .opencode/opencode.json')).toBe('deny');
    expect(decide(rules, 'shell', 'git status')).toBe('allow');
  });

  it('turns Code Mode off, and OpenCode 1’s subagents', () => {
    expect(decide(contactSessionRules(2, folder), 'execute', '*')).toBe('deny');
    expect(decide(contactSessionRules(1, folder), 'task', '*')).toBe('deny');
    expect(decide(contactSessionRules(1, folder), 'bash', '/x/.agentinbox/key')).toBe('deny');
  });
});

describe('fitsPattern', () => {
  it('matches as OpenCode matches its rules', () => {
    expect(fitsPattern('git status', 'git *')).toBe(true);
    // A pattern that ends with ` *` fits the words before it alone too.
    expect(fitsPattern('ls', 'ls *')).toBe(true);
    expect(fitsPattern('ls -la', 'ls *')).toBe(true);
    expect(fitsPattern('lsof -i', 'ls *')).toBe(false);
    expect(fitsPattern('a.txt', '?.txt')).toBe(true);
    expect(fitsPattern('ab.txt', '?.txt')).toBe(false);
    expect(fitsPattern('src\\a.ts', 'src/*')).toBe(true);
    expect(fitsPattern('read', 're(a)d')).toBe(false);
  });
});

describe('decideOpenCodeCall', () => {
  const shell = (command: string) => ({ name: 'shell', patterns: [command], input: { command }, metadata: {} });
  const tool = (name: string, input: Record<string, unknown>, patterns: string[] = []) => ({
    name,
    patterns,
    input,
    metadata: {},
  });
  let folder: OpenCodeFolder;

  beforeEach(() => {
    mkdirSync(join(home, '.agentinbox'), { recursive: true });
    writeFileSync(join(home, '.agentinbox', 'config.json'), '{}');
    mkdirSync(join(project, 'docs'));
    writeFileSync(join(project, 'docs', 'a.md'), '');
    writeFileSync(
      join(project, 'opencode.json'),
      JSON.stringify({
        permission: {
          read: 'allow',
          glob: 'allow',
          grep: 'allow',
          external_directory: 'allow',
          bash: { 'cat *': 'allow', 'git *': 'allow', 'npm publish': 'ask' },
        },
      })
    );
    folder = readOpenCodeFolder(project, 2, home);
  });

  it('lets through what the folder’s rules allow, and asks or refuses as they say', () => {
    expect(decideOpenCodeCall(2, folder, shell('cat docs/a.md'))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, folder, shell('git status && cat docs/a.md'))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, folder, shell('npm publish'))).toEqual({ decision: 'ask' });
    expect(decideOpenCodeCall(2, folder, shell('rm -rf build'))).toEqual({
      decision: 'deny',
      why: 'the folder’s OpenCode settings don’t allow it',
    });
    const readme = join(project, 'docs', 'a.md');
    expect(decideOpenCodeCall(2, folder, tool('read', { filePath: readme }, [readme]))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, folder, tool('grep', { pattern: 'TODO' }, ['TODO']))).toEqual({ decision: 'allow' });
    // What OpenCode decides by its rules alone.
    expect(decideOpenCodeCall(2, folder, tool('webfetch', {}, ['https://example.com']))).toBeUndefined();
  });

  it('keeps the key closed, whatever a command’s words, quotes, patterns or links say', () => {
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    for (const command of [
      'cat ~/.agentinbox/config.json',
      "cat ~/.agent''inbox/config.json",
      'cat ~/.agent*/config.json',
      'cat docs/inbox/config.json',
      `cat ${home}/.ag?ntinbox/config.json`,
    ]) {
      expect(decideOpenCodeCall(2, folder, shell(command)), command).toEqual({
        decision: 'deny',
        why: 'it could reach Agent Inbox’s key',
      });
    }
    const key = join(project, 'docs', 'inbox', 'config.json');
    expect(decideOpenCodeCall(2, folder, tool('read', { filePath: key }, [key]))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, folder, tool('grep', { pattern: 'secretKey', path: home }))).toMatchObject({
      decision: 'deny',
    });
    expect(decideOpenCodeCall(2, folder, tool('glob', { pattern: '../../**/*.json' }))).toMatchObject({
      decision: 'deny',
    });
    // Outside the project is fine, as long as it isn't where the key is.
    expect(decideOpenCodeCall(2, folder, tool('external_directory', {}, [`${home}/*`]))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, folder, tool('external_directory', {}, [`${home}/.agentinbox/*`]))).toMatchObject({
      decision: 'deny',
    });
  });

  it('keeps the file INBOX_CONFIG points at closed too', () => {
    writeFileSync(join(project, 'inbox.json'), '{}');
    const custom = readOpenCodeFolder(project, 2, home, join(project, 'inbox.json'));
    const file = join(project, 'inbox.json');

    expect(decideOpenCodeCall(2, custom, shell('cat inbox.json'))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, custom, tool('read', { filePath: file }, [file]))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, custom, tool('grep', { pattern: 'secretKey' }))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, folder, shell('cat inbox.json'))).toEqual({ decision: 'allow' });
  });

  it('refuses an edit or a command that reaches what decides a run through a link', () => {
    writeFileSync(join(project, 'AGENTS.md'), '');
    symlinkSync('../opencode.json', join(project, 'docs', 'settings.json'));
    symlinkSync('../AGENTS.md', join(project, 'docs', 'guide.md'));
    writeFileSync(
      join(project, 'opencode.json'),
      JSON.stringify({ permission: { edit: { 'docs/*': 'allow' }, bash: { 'cp *': 'allow', 'cd *': 'allow' } } })
    );
    const linked = readOpenCodeFolder(project, 2, home);
    const edit = (file: string) => tool('edit', { filePath: join(project, file) }, [file]);

    expect(decideOpenCodeCall(2, linked, edit('docs/a.md'))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, linked, shell('cp docs/a.md docs/b.md'))).toEqual({ decision: 'allow' });
    for (const call of [
      edit('docs/settings.json'),
      edit('docs/guide.md'),
      shell('cp docs/a.md docs/settings.json'),
      shell('cd docs && cp a.md guide.md'),
    ]) {
      expect(decideOpenCodeCall(2, linked, call), call.patterns[0]).toEqual({
        decision: 'deny',
        why: 'it reaches what decides a run',
      });
    }
  });

  it('refuses an edit or a command that reaches where a link among what decides a run leads, out of the folder too', () => {
    // The folder's `.opencode` is a link to settings kept elsewhere: OpenCode reads them through it.
    const shared = join(dir, 'shared', 'opencode');
    mkdirSync(shared, { recursive: true });
    symlinkSync(shared, join(project, '.opencode'));
    writeFileSync(
      join(project, 'opencode.json'),
      JSON.stringify({ permission: { edit: 'allow', external_directory: 'allow', bash: { 'cp *': 'allow' } } })
    );
    const linked = readOpenCodeFolder(project, 2, home);
    const agent = join(shared, 'agents', 'helper.md');
    const notes = join(dir, 'shared', 'notes.md');

    for (const call of [tool('edit', { filePath: agent }, [agent]), shell(`cp notes.md ${agent}`)]) {
      expect(decideOpenCodeCall(2, linked, call), call.name).toEqual({
        decision: 'deny',
        why: 'it reaches what decides a run',
      });
    }
    expect(decideOpenCodeCall(2, linked, tool('edit', { filePath: notes }, [notes]))).toEqual({ decision: 'allow' });
  });

  it('refuses an edit or a command that reaches where a link inside what decides a run leads', () => {
    // `.opencode` is the folder's own, and its settings are a link to a file kept elsewhere in the project.
    mkdirSync(join(project, '.opencode'));
    writeFileSync(join(project, 'docs', 'oc.json'), '{}');
    symlinkSync('../docs/oc.json', join(project, '.opencode', 'opencode.json'));
    writeFileSync(
      join(project, 'opencode.json'),
      JSON.stringify({ permission: { edit: 'allow', bash: { 'cp *': 'allow' } } })
    );
    const linked = readOpenCodeFolder(project, 2, home);
    const settings = join(project, 'docs', 'oc.json');
    const readme = join(project, 'docs', 'a.md');

    for (const call of [tool('edit', { filePath: settings }, ['docs/oc.json']), shell('cp docs/a.md docs/oc.json')]) {
      expect(decideOpenCodeCall(2, linked, call), call.name).toEqual({
        decision: 'deny',
        why: 'it reaches what decides a run',
      });
    }
    expect(decideOpenCodeCall(2, linked, tool('edit', { filePath: readme }, ['docs/a.md']))).toEqual({
      decision: 'allow',
    });
  });

  it('leaves what the shell works out for itself to a rule for every command', () => {
    expect(decideOpenCodeCall(2, folder, shell('cat docs/a.md | sh'))).toEqual({
      decision: 'deny',
      why: 'only a rule for every command covers what the shell works out for itself',
    });
    expect(decideOpenCodeCall(2, folder, shell('cat $(echo docs/a.md)'))).toMatchObject({ decision: 'deny' });
    writeFileSync(join(project, 'opencode.json'), JSON.stringify({ permission: { bash: 'allow' } }));
    const every = readOpenCodeFolder(project, 2, home);
    expect(decideOpenCodeCall(2, every, shell('cat docs/a.md | wc -l'))).toEqual({ decision: 'allow' });
    expect(decideOpenCodeCall(2, every, shell('cat ~/.agent*/config.json | sh'))).toMatchObject({ decision: 'deny' });
  });

  it('refuses every command and every search in a folder whose links git keeps lead to the key', () => {
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'assets'));
    execFileSync('git', ['init', '-q'], { cwd: project });
    execFileSync('git', ['add', 'docs'], { cwd: project });
    const linked = readOpenCodeFolder(project, 2, home);
    const readme = join(project, 'docs', 'a.md');

    expect(linked.guard.links).toEqual([join(project, 'docs', 'assets')]);
    expect(decideOpenCodeCall(2, linked, shell('git status'))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, linked, tool('grep', { pattern: 'TODO' }))).toMatchObject({ decision: 'deny' });
    expect(decideOpenCodeCall(2, linked, tool('read', { filePath: readme }, [readme]))).toEqual({ decision: 'allow' });
  });
});

describe('contactConfigContent', () => {
  const helper = { command: '/usr/local/bin/node', args: ['/opt/agentinbox/index.js', 'conversation-tools'] };

  it('adds the run’s own conversation tools as a local MCP server, as each OpenCode writes one', () => {
    expect(JSON.parse(contactConfigContent(1, helper, {}))).toEqual({
      mcp: {
        this_conversation: {
          type: 'local',
          command: ['/usr/local/bin/node', '/opt/agentinbox/index.js', 'conversation-tools'],
          enabled: true,
        },
      },
    });
    expect(JSON.parse(contactConfigContent(2, helper, { INBOX_CONFIG: '/tmp/config.json' }))).toEqual({
      mcp: {
        servers: {
          this_conversation: {
            type: 'local',
            command: ['/usr/local/bin/node', '/opt/agentinbox/index.js', 'conversation-tools'],
            environment: { INBOX_CONFIG: '/tmp/config.json' },
          },
        },
      },
    });
  });

  it('keeps what the environment already set', () => {
    const given = JSON.stringify({ model: 'anthropic/claude', mcp: { servers: { docs: { type: 'local' } } } });

    expect(JSON.parse(contactConfigContent(2, helper, { OPENCODE_CONFIG_CONTENT: given }))).toMatchObject({
      model: 'anthropic/claude',
      mcp: { servers: { docs: { type: 'local' }, this_conversation: { type: 'local' } } },
    });
  });
});

describe('parseJsonc', () => {
  it('reads JSON with comments and trailing commas, and leaves strings alone', () => {
    expect(
      parseJsonc(`{
        // a comment
        "url": "https://example.com/*not-a-comment*/", /* another */
        "list": [1, 2,],
      }`)
    ).toEqual({ url: 'https://example.com/*not-a-comment*/', list: [1, 2] });
    expect(parseJsonc('{ "a": "say \\"hi\\" // still a string" }')).toEqual({ a: 'say "hi" // still a string' });
    expect(parseJsonc('{ broken')).toBeUndefined();
  });

  it('keeps a comma before a `}` or `]` inside a string, as in a rule for a command', () => {
    expect(
      parseJsonc(`{
        "permission": { "bash": { "printf 'x,}'": "allow", "cp file{a, }": "ask", "echo [1,]": "deny", }, },
      }`)
    ).toEqual({ permission: { bash: { "printf 'x,}'": 'allow', 'cp file{a, }': 'ask', 'echo [1,]': 'deny' } } });
    // A comment between the comma and the end doesn't keep the comma.
    expect(parseJsonc('{ "a": 1, // the last one\n}')).toEqual({ a: 1 });
  });
});
