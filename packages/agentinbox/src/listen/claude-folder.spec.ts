import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type ClaudeFolder,
  claudeToolsFor,
  decideForContact,
  matchesCommand,
  parseRule,
  pathPattern,
  readClaudeFolder,
} from './claude-folder';

let root: string;
let project: string;
let home: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'claude-folder-')));
  project = join(root, 'app');
  home = join(root, 'home');
  mkdirSync(join(project, '.claude', 'skills', 'refunds'), { recursive: true });
  mkdirSync(join(home, '.agentinbox'), { recursive: true });
  writeFileSync(join(home, '.agentinbox', 'config.json'), '{}');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function folder(permissions: { allow?: string[]; ask?: string[]; deny?: string[] }): ClaudeFolder {
  writeFileSync(join(project, '.claude', 'settings.json'), JSON.stringify({ permissions }));

  return readClaudeFolder(project, home);
}

const decide = (given: ClaudeFolder, tool: string, input: Record<string, unknown>) =>
  decideForContact(given, tool, input);

describe('readClaudeFolder', () => {
  it('reads the folder’s shared settings only, its skills, and the MCP servers a rule names', () => {
    writeFileSync(join(project, '.claude', 'skills', 'refunds', 'SKILL.md'), '---\nname: refunds\n---\n');
    mkdirSync(join(project, '.claude', 'skills', 'empty'));
    writeFileSync(
      join(project, '.claude', 'settings.local.json'),
      JSON.stringify({ permissions: { allow: ['Bash(git push)'] } })
    );
    writeFileSync(
      join(project, '.mcp.json'),
      JSON.stringify({
        mcpServers: { docs: { command: 'docs' }, crm: { command: 'crm' }, idle: { command: 'idle' } },
      })
    );
    writeFileSync(
      join(project, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: {
          allow: ['Bash(npm test)', 'mcp__docs__search', 'mcp__crm'],
          ask: ['WebFetch'],
          deny: ['Read(./.env)'],
        },
        disabledMcpjsonServers: ['crm'],
      })
    );

    const read = readClaudeFolder(project);

    expect(read.allow).toEqual([
      { tool: 'Bash', specifier: 'npm test' },
      { tool: 'mcp__docs__search' },
      { tool: 'mcp__crm' },
    ]);
    expect(read.ask).toEqual([{ tool: 'WebFetch' }]);
    expect(read.deny).toEqual([{ tool: 'Read', specifier: './.env' }]);
    expect(read.skills).toEqual(['refunds']);
    expect(read.mcpServers).toEqual({ docs: { command: 'docs' } });
  });

  it('reads nothing from settings that aren’t there or can’t be read', () => {
    writeFileSync(join(project, '.claude', 'settings.json'), '{ not json');

    expect(readClaudeFolder(project)).toMatchObject({ allow: [], ask: [], deny: [], mcpServers: {} });
  });
});

describe('parseRule and claudeToolsFor', () => {
  it('read rules as Claude Code writes them', () => {
    expect(parseRule('Bash(npm run test:*)')).toEqual({ tool: 'Bash', specifier: 'npm run test:*' });
    expect(parseRule('WebSearch')).toEqual({ tool: 'WebSearch' });
    expect(parseRule('Bash(*)')).toEqual({ tool: 'Bash' });
    expect(parseRule('Bash(oops')).toBeUndefined();
    expect(parseRule('  ')).toBeUndefined();
  });

  it('start a contact’s run with the tools its rules name, skills when the folder has them, and asking the person', () => {
    const given: ClaudeFolder = {
      project,
      allow: [{ tool: 'Read', specifier: './docs/**' }, { tool: 'mcp__docs' }],
      ask: [{ tool: 'Bash', specifier: 'npm test' }],
      deny: [{ tool: 'WebFetch' }],
      skills: [],
      mcpServers: {},
      guard: { home, places: [], links: [] },
    };

    expect(claudeToolsFor(given)).toEqual(['AskUserQuestion', 'Read', 'Glob', 'Grep', 'LS', 'NotebookRead', 'Bash']);
    expect(claudeToolsFor({ ...given, allow: [], ask: [], skills: ['refunds'] })).toEqual(['AskUserQuestion', 'Skill']);
  });
});

describe('matchesCommand and pathPattern', () => {
  it('match commands as Claude Code does', () => {
    expect(matchesCommand('npm run test:*', 'npm run test')).toBe(true);
    expect(matchesCommand('npm run test:*', 'npm run test -- --watch')).toBe(true);
    expect(matchesCommand('npm run test:*', 'npm run tests')).toBe(false);
    expect(matchesCommand('git log *', 'git log --oneline')).toBe(true);
    expect(matchesCommand('ls *', 'lsof -i')).toBe(false);
    expect(matchesCommand('npm test', 'npm test')).toBe(true);
    expect(matchesCommand('npm test', 'npm test && rm -rf ~')).toBe(false);
  });

  it('match paths gitignore-style, from the project, the home folder or the root', () => {
    const place = { project: '/work/app', home: '/home/ada' };

    expect(pathPattern('./docs/**', place).test('/work/app/docs/a/b.md')).toBe(true);
    expect(pathPattern('./docs/**', place).test('/work/app/src/a.ts')).toBe(false);
    expect(pathPattern('/src/*.ts', place).test('/work/app/src/a.ts')).toBe(true);
    expect(pathPattern('/src/*.ts', place).test('/work/app/src/deep/a.ts')).toBe(false);
    expect(pathPattern('~/notes', place).test('/home/ada/notes/today.md')).toBe(true);
    expect(pathPattern('//etc/hosts', place).test('/etc/hosts')).toBe(true);
  });
});

describe('decideForContact', () => {
  it('lets the run’s own conversation tools and asking the person through, and refuses anything without a rule', () => {
    const none = folder({});

    expect(decide(none, 'mcp__this_conversation__read', {})).toBe('allow');
    expect(decide(none, 'mcp__this_conversation__resolve', {})).toBe('allow');
    expect(decide(none, 'AskUserQuestion', { questions: [] })).toBe('allow');
    // What Claude Code would do by itself, without any rule, a contact's run doesn't.
    expect(decide(none, 'Read', { file_path: join(project, 'notes.txt') })).toBe('deny');
    expect(decide(none, 'Bash', { command: 'echo hi' })).toBe('deny');
    expect(decide(none, 'WebSearch', { query: 'weather' })).toBe('deny');
    expect(decide(none, 'mcp__plugin_agentinbox_AgentInbox__inbox_send', {})).toBe('deny');
  });

  it('goes by deny, then ask, then allow, as Claude Code does', () => {
    const given = folder({
      allow: ['Bash(npm run *)', 'Bash(git status)'],
      ask: ['Bash(npm run deploy)'],
      deny: ['Bash(npm run nuke)'],
    });

    expect(decide(given, 'Bash', { command: 'npm run test' })).toBe('allow');
    expect(decide(given, 'Bash', { command: 'npm run deploy' })).toBe('ask');
    expect(decide(given, 'Bash', { command: 'npm run nuke' })).toBe('deny');
    expect(decide(given, 'Bash', { command: 'npm run test && git status' })).toBe('allow');
    expect(decide(given, 'Bash', { command: 'git status && npm run deploy' })).toBe('ask');
    expect(decide(given, 'Bash', { command: 'git status && npm run nuke' })).toBe('deny');
    expect(decide(given, 'Bash', { command: 'git status && rm -rf ~' })).toBe('deny');
  });

  it('leaves what the shell works out for itself to a rule for every command, and reads denies generously there', () => {
    const some = folder({ allow: ['Bash(cat:*)'] });
    expect(decide(some, 'Bash', { command: 'cat a.txt | sh' })).toBe('deny');
    expect(decide(some, 'Bash', { command: 'cat $(echo a.txt)' })).toBe('deny');
    expect(decide(some, 'Bash', { command: "cat 'a b.txt'" })).toBe('allow');

    const every = folder({ allow: ['Bash'], deny: ['Bash(rm:*)'] });
    expect(decide(every, 'Bash', { command: 'cat a.txt | wc -l' })).toBe('allow');
    expect(decide(every, 'Bash', { command: 'echo hi; rm -rf /' })).toBe('deny');
    expect(decide(every, 'Bash', { command: 'echo `whoami`' })).toBe('deny');
  });

  it('keeps the key closed, whatever a rule names, commands and files alike', () => {
    const broad = folder({ allow: ['Bash', 'Bash(cat:*)', 'Read'] });
    const key = join(home, '.agentinbox', 'config.json');

    expect(decide(broad, 'Bash', { command: 'cat ~/.agentinbox/config.json' })).toBe('deny');
    expect(decide(broad, 'Bash', { command: 'cat ~/.agent*/config.json' })).toBe('deny');
    expect(decide(broad, 'Bash', { command: 'cat ~/.ag"ent"inbox/config.json' })).toBe('deny');
    expect(decide(broad, 'Bash', { command: 'INBOX_CONFIG=x env' })).toBe('deny');
    expect(decide(broad, 'Read', { file_path: key })).toBe('deny');
    expect(decide(broad, 'Read', { file_path: '~/.agentinbox/config.json' })).toBe('deny');
    expect(decide(broad, 'Grep', { pattern: 'secret', path: home })).toBe('deny');
    expect(decide(broad, 'Read', { file_path: join(project, 'notes.txt') })).toBe('allow');

    // Not even a rule that names it opens it: only full access does.
    const named = folder({ allow: ['Read(~/.agentinbox/**)', 'Bash(cat ~/.agentinbox/config.json)'] });
    expect(decide(named, 'Read', { file_path: key })).toBe('deny');
    expect(decide(named, 'Bash', { command: 'cat ~/.agentinbox/config.json' })).toBe('deny');
  });

  it('keeps the key closed through the links a command names, from where Claude Code’s shell is', () => {
    const given = folder({ allow: ['Bash(cat:*)', 'Bash(grep:*)', 'Bash(cd docs)'] });
    mkdirSync(join(project, 'docs'));
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    writeFileSync(join(project, 'docs', 'a.md'), '');

    expect(decide(given, 'Bash', { command: 'cat docs/a.md' })).toBe('allow');
    expect(decide(given, 'Bash', { command: 'cd docs && cat a.md' })).toBe('allow');
    expect(decide(given, 'Bash', { command: 'cat docs/inbox/config.json' })).toBe('deny');
    expect(decideForContact(given, 'Bash', { command: 'cat inbox/config.json' }, join(project, 'docs'))).toBe('deny');
    // A `cd` in the chain moves where the next command runs.
    expect(decide(given, 'Bash', { command: 'cd docs && cat inbox/config.json' })).toBe('deny');
    expect(decide(given, 'Bash', { command: `grep -r secretKey ${home}` })).toBe('deny');
  });

  it('refuses every command, and every search, in a folder whose links git keeps lead to the key', () => {
    mkdirSync(join(project, 'docs'));
    writeFileSync(join(project, 'docs', 'a.md'), '');
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'assets'));
    execFileSync('git', ['init', '-q'], { cwd: project });
    execFileSync('git', ['add', 'docs'], { cwd: project });
    const given = folder({ allow: ['Bash(ls:*)', 'Read'] });

    expect(decide(given, 'Bash', { command: 'ls' })).toBe('deny');
    expect(decide(given, 'Grep', { pattern: 'secretKey', path: project })).toBe('deny');
    expect(decide(given, 'Read', { file_path: join(project, 'docs', 'a.md') })).toBe('allow');
    expect(decide(given, 'Read', { file_path: join(project, 'docs', 'assets', 'config.json') })).toBe('deny');
  });

  it('keeps the file INBOX_CONFIG points the CLI at closed too', () => {
    writeFileSync(join(project, 'inbox.json'), '{}');
    writeFileSync(
      join(project, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Read', 'Bash(cat:*)'] } })
    );
    const given = readClaudeFolder(project, home, join(project, 'inbox.json'));

    expect(decide(given, 'Read', { file_path: join(project, 'inbox.json') })).toBe('deny');
    expect(decide(given, 'Bash', { command: 'cat inbox.json' })).toBe('deny');
    expect(decide(given, 'Grep', { pattern: 'secretKey', path: project })).toBe('deny');
    expect(decide(given, 'Read', { file_path: join(project, 'notes.txt') })).toBe('allow');
    expect(decide(folder({ allow: ['Read'] }), 'Read', { file_path: join(project, 'inbox.json') })).toBe('allow');
  });

  it('follows links before it matches a path, so one out of the folder doesn’t count as in it', () => {
    const given = folder({ allow: ['Read(./docs/**)'] });
    mkdirSync(join(project, 'docs'));
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    writeFileSync(join(project, 'docs', 'a.md'), '');

    expect(decide(given, 'Read', { file_path: join(project, 'docs', 'a.md') })).toBe('allow');
    expect(decide(given, 'Read', { file_path: join(project, 'docs', 'inbox', 'config.json') })).toBe('deny');
    expect(decide(given, 'Read', { file_path: join(project, 'src', 'a.ts') })).toBe('deny');
    expect(decide(given, 'Glob', { pattern: '../**/*.json', path: join(project, 'docs') })).toBe('deny');
  });

  it('asks the operator before an edit to what decides a run, whatever allows it', () => {
    const given = folder({ allow: ['Edit', 'Bash(cp:*)'] });

    expect(decide(given, 'Edit', { file_path: join(project, 'src', 'a.ts') })).toBe('allow');
    expect(decide(given, 'Edit', { file_path: join(project, '.claude', 'settings.json') })).toBe('ask');
    expect(decide(given, 'Write', { file_path: join(project, '.mcp.json') })).toBe('ask');
    expect(decide(given, 'Write', { file_path: join(project, 'CLAUDE.md') })).toBe('ask');
    expect(decide(given, 'Bash', { command: 'cp evil.json .claude/settings.json' })).toBe('ask');
  });

  it('asks before a command or an edit that reaches what decides a run through a link', () => {
    const given = folder({ allow: ['Edit', 'Bash(cp:*)', 'Bash(cd:*)'] });
    mkdirSync(join(project, 'docs'));
    writeFileSync(join(project, 'AGENTS.md'), '');
    writeFileSync(join(project, 'docs', 'a.md'), '');
    symlinkSync('../AGENTS.md', join(project, 'docs', 'guide.md'));

    expect(decide(given, 'Bash', { command: 'cp docs/a.md docs/b.md' })).toBe('allow');
    expect(decide(given, 'Bash', { command: 'cp docs/a.md docs/guide.md' })).toBe('ask');
    expect(decide(given, 'Bash', { command: 'cd docs && cp a.md guide.md' })).toBe('ask');
    expect(decide(given, 'Edit', { file_path: join(project, 'docs', 'guide.md') })).toBe('ask');
  });

  it('asks before changing where a link among what decides a run leads, out of the folder too', () => {
    // The folder's `.claude` is a link to settings kept elsewhere: the run reads them through it.
    const shared = join(root, 'shared', 'claude');
    mkdirSync(shared, { recursive: true });
    rmSync(join(project, '.claude'), { recursive: true });
    symlinkSync(shared, join(project, '.claude'));
    const given = folder({ allow: ['Edit', 'Bash(cp:*)'] });

    expect(decide(given, 'Edit', { file_path: join(project, '.claude', 'settings.json') })).toBe('ask');
    expect(decide(given, 'Edit', { file_path: join(shared, 'settings.json') })).toBe('ask');
    expect(decide(given, 'Bash', { command: `cp evil.json ${join(shared, 'settings.json')}` })).toBe('ask');
    expect(decide(given, 'Edit', { file_path: join(root, 'shared', 'notes.md') })).toBe('allow');
  });

  it('asks before changing where a link inside what decides a run leads', () => {
    // `.claude` is the folder's own, and its settings are a link to a file kept elsewhere in the project.
    writeFileSync(join(project, 'shared-settings.json'), '{}');
    symlinkSync('../shared-settings.json', join(project, '.claude', 'settings.json'));
    const given = folder({ allow: ['Edit', 'Bash(cp:*)'] });

    expect(decide(given, 'Edit', { file_path: join(project, 'shared-settings.json') })).toBe('ask');
    expect(decide(given, 'Bash', { command: 'cp evil.json shared-settings.json' })).toBe('ask');
    expect(decide(given, 'Edit', { file_path: join(project, 'notes.md') })).toBe('allow');
  });

  it('lets the folder’s skills, the MCP tools and the web hosts its rules name through', () => {
    const given = folder({
      allow: ['mcp__docs__search', 'mcp__crm', 'WebFetch(domain:docs.example.com)', 'Skill(release-notes)'],
    });

    expect(decide(given, 'Skill', { skill: 'refunds' })).toBe('deny');
    writeFileSync(join(project, '.claude', 'skills', 'refunds', 'SKILL.md'), '---\nname: refunds\n---\n');
    const withSkill = readClaudeFolder(project, home);
    expect(decide(withSkill, 'Skill', { skill: 'refunds' })).toBe('allow');
    expect(decide(withSkill, 'Skill', { skill: 'release-notes' })).toBe('allow');
    expect(decide(withSkill, 'Skill', { skill: 'update-config' })).toBe('deny');
    expect(decide(withSkill, 'mcp__docs__search', {})).toBe('allow');
    expect(decide(withSkill, 'mcp__docs__delete', {})).toBe('deny');
    expect(decide(withSkill, 'mcp__crm__anything', {})).toBe('allow');
    expect(decide(withSkill, 'WebFetch', { url: 'https://docs.example.com/a' })).toBe('allow');
    expect(decide(withSkill, 'WebFetch', { url: 'https://evil.example.com/a' })).toBe('deny');
  });
});
