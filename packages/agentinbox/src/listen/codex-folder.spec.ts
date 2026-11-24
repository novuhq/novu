import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type CodexFolder,
  codexHookAnswer,
  contactHookFlags,
  decideCodexTool,
  execPolicyCheck,
  FOLDER_VARIABLE,
  type RuleCheck,
  readCodexFolder,
  readRefusal,
  refusalOf,
  shellLine,
} from './codex-folder';
import { keyGuardFor } from './contact-guard';

const FAKE_CODEX = fileURLToPath(new URL('./fake-codex.fixture.mjs', import.meta.url));

let dir: string;
let home: string;

beforeEach(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'codex-folder-')));
  home = join(dir, 'home');
  mkdirSync(join(home, '.agentinbox'), { recursive: true });
  mkdirSync(join(dir, 'app', '.agents', 'skills', 'hello'), { recursive: true });
  writeFileSync(join(dir, 'app', '.agents', 'skills', 'hello', 'SKILL.md'), '# Hello');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function folder(more: Partial<CodexFolder> = {}): CodexFolder {
  return {
    project: join(dir, 'app'),
    rules: [],
    skills: [join(dir, 'app', '.agents', 'skills', 'hello')],
    servers: ['docs'],
    otherServers: [],
    otherSkills: [],
    otherHooks: [],
    features: [],
    guard: keyGuardFor(join(dir, 'app'), home),
    ...more,
  };
}

/** The folder's rules as a table: words a rule starts with, and what it says. */
function rules(table: Record<string, 'allow' | 'prompt' | 'forbidden'>): RuleCheck {
  return async (words) => {
    const matched = Object.entries(table).filter(([prefix]) =>
      prefix.split(' ').every((word, index) => words[index] === word)
    );
    const order = ['allow', 'prompt', 'forbidden'];
    const decision = matched.map(([, said]) => said).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];

    return { ...(decision ? { decision } : {}), prefixes: matched.map(([prefix]) => prefix.split(' ')) };
  };
}

const bash = (command: string) => ({ tool: 'Bash', input: { command } });

describe('readCodexFolder', () => {
  const check = '/usr/local/bin/node /usr/local/lib/agentinbox/index.js contact-check --host codex';

  it('takes only what the folder’s own loaded settings give, and finds the listener’s check among the hooks', () => {
    const dotCodex = join(dir, 'app', '.codex');
    mkdirSync(join(dotCodex, 'rules'), { recursive: true });
    writeFileSync(join(dotCodex, 'rules', 'b.rules'), '');
    writeFileSync(join(dotCodex, 'rules', 'a.rules'), '');
    writeFileSync(join(dotCodex, 'rules', 'notes.txt'), '');

    const { folder: read, hook } = readCodexFolder(
      join(dir, 'app'),
      {
        read: {
          config: { mcp_servers: { docs: {}, github: {}, this_conversation: {} } },
          layers: [
            { name: { type: 'sessionFlags' }, config: {} },
            {
              name: { type: 'project', dotCodexFolder: dotCodex },
              config: {
                mcp_servers: { docs: { command: 'docs-mcp' }, github: { enabled: true } },
                web_search: 'live',
                features: { view_image: true, shell_tool: true },
                developer_instructions: 'Answer in French.',
              },
            },
            {
              name: { type: 'project', dotCodexFolder: join(dir, '.codex') },
              config: { mcp_servers: { secret: { command: 'secret-mcp' } } },
              disabledReason: 'Trust the project to load it.',
            },
            { name: { type: 'user' }, config: { mcp_servers: { github: { url: 'https://github.example/mcp' } } } },
          ],
        },
        skills: {
          data: [
            {
              skills: [
                { path: join(dir, 'app', '.agents', 'skills', 'hello', 'SKILL.md'), scope: 'repo' },
                { path: join(home, '.codex', 'skills', 'mine', 'SKILL.md'), scope: 'user' },
                { path: '/codex/skills/.system/imagegen/SKILL.md', scope: 'system' },
              ],
            },
          ],
        },
        hooks: {
          data: [
            {
              hooks: [
                { key: 'ours', source: 'sessionFlags', command: check, currentHash: 'sha256:1' },
                { key: 'theirs', source: 'user', command: 'approve-all' },
                { key: 'folder', source: 'project', command: 'lint' },
                { key: 'company', source: 'mdm', command: 'audit', isManaged: true },
              ],
            },
          ],
        },
      },
      check,
      home
    );

    expect(read).toEqual({
      project: join(dir, 'app'),
      rules: [join(dotCodex, 'rules', 'a.rules'), join(dotCodex, 'rules', 'b.rules')],
      skills: [join(dir, 'app', '.agents', 'skills', 'hello')],
      servers: ['docs'],
      otherServers: ['github'],
      otherSkills: [join(home, '.codex', 'skills', 'mine', 'SKILL.md'), '/codex/skills/.system/imagegen/SKILL.md'],
      otherHooks: ['theirs'],
      webSearch: 'live',
      features: ['view_image'],
      instructions: 'Answer in French.',
      guard: { home, places: [join(home, '.agentinbox')], links: [] },
    });
    expect(hook).toMatchObject({ key: 'ours', currentHash: 'sha256:1' });
  });

  it('gives nothing when Codex doesn’t load the folder’s settings', () => {
    const { folder: read, hook } = readCodexFolder(
      join(dir, 'app'),
      { read: { config: { mcp_servers: { github: {} } }, layers: null }, skills: {}, hooks: {} },
      check,
      home
    );

    expect(read).toEqual({
      project: join(dir, 'app'),
      rules: [],
      skills: [],
      servers: [],
      otherServers: ['github'],
      otherSkills: [],
      otherHooks: [],
      features: [],
      guard: { home, places: [join(home, '.agentinbox')], links: [] },
    });
    expect(hook).toBeUndefined();
  });
});

describe('decideCodexTool: commands', () => {
  it('runs what a rule allows, asks what a rule says to ask, and refuses the rest with no card', async () => {
    const check = rules({ 'npm test': 'allow', 'npm publish': 'prompt', rm: 'forbidden' });

    expect(await decideCodexTool(folder(), bash('npm test'), check)).toEqual({
      decision: 'allow',
      what: '`npm test`',
    });
    expect((await decideCodexTool(folder(), bash('npm publish --tag next'), check)).decision).toBe('ask');
    expect(await decideCodexTool(folder(), bash('rm -rf build'), check)).toEqual({
      decision: 'deny',
      what: '`rm -rf build`',
      why: 'a rule in the folder’s Codex settings forbids it',
    });
    expect(await decideCodexTool(folder(), bash('echo hi'), check)).toEqual({
      decision: 'deny',
      what: '`echo hi`',
      why: 'no rule in the folder’s Codex settings allows it',
    });
  });

  it('decides a chain by its parts, and refuses what the shell works out for itself', async () => {
    const check = rules({ 'npm test': 'allow', 'npm publish': 'prompt' });

    expect((await decideCodexTool(folder(), bash('npm test && npm publish'), check)).decision).toBe('ask');
    expect((await decideCodexTool(folder(), bash('npm test && cat .env'), check)).decision).toBe('deny');
    for (const command of ['npm test | tee out', 'npm test; ls', 'npm test > out', 'npm test $FLAGS', 'npm test *']) {
      expect(await decideCodexTool(folder(), bash(command), check)).toMatchObject({
        decision: 'deny',
        why: 'only plain commands are checked, alone or joined with &&',
      });
    }
  });

  it('keeps the key closed, whatever a rule names, through links and in the file INBOX_CONFIG points at', async () => {
    const broad = rules({ cat: 'allow' });
    const naming = rules({ 'cat ~/.agentinbox/config.json': 'allow' });
    const project = join(dir, 'app');
    const at = (command: string) => ({ ...bash(command), cwd: project });
    mkdirSync(join(project, 'docs'));
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    writeFileSync(join(project, 'inbox.json'), '{}');

    expect(await decideCodexTool(folder(), bash('cat ~/.agentinbox/config.json'), broad)).toMatchObject({
      decision: 'deny',
      why: 'it could reach Agent Inbox’s key',
    });
    expect(
      await decideCodexTool(folder(), bash(`cat ${join(home, '.agentinbox', 'config.json')}`), broad)
    ).toMatchObject({
      decision: 'deny',
    });
    // Not even a rule that names it opens it: only full access does.
    expect((await decideCodexTool(folder(), bash('cat ~/.agentinbox/config.json'), naming)).decision).toBe('deny');
    expect(await decideCodexTool(folder(), at('cat docs/inbox/config.json'), broad)).toMatchObject({
      decision: 'deny',
      why: 'it could reach Agent Inbox’s key',
    });
    expect((await decideCodexTool(folder(), at('cat inbox.json'), broad)).decision).toBe('allow');
    const custom = folder({ guard: keyGuardFor(project, home, join(project, 'inbox.json')) });
    expect((await decideCodexTool(custom, at('cat inbox.json'), broad)).decision).toBe('deny');
  });

  it('refuses a change to what decides a run, even where a rule allows it, and asks where a rule says to ask', async () => {
    expect(
      await decideCodexTool(folder(), bash('cp evil.rules .codex/rules/default.rules'), rules({ cp: 'allow' }))
    ).toMatchObject({ decision: 'deny', why: 'it would change the folder’s own settings or instructions' });
    expect((await decideCodexTool(folder(), bash('cp notes.md AGENTS.md'), rules({ cp: 'prompt' }))).decision).toBe(
      'ask'
    );
    expect((await decideCodexTool(folder(), bash('cat AGENTS.md'), rules({ cat: 'allow' }))).decision).toBe('allow');
  });

  it('refuses a change to what decides a run through a link too, from where each command runs', async () => {
    const project = join(dir, 'app');
    const at = (command: string) => ({ ...bash(command), cwd: project });
    const check = rules({ cp: 'allow', cd: 'allow' });
    mkdirSync(join(project, 'docs'));
    writeFileSync(join(project, 'AGENTS.md'), '');
    writeFileSync(join(project, 'docs', 'a.md'), '');
    symlinkSync('../AGENTS.md', join(project, 'docs', 'guide.md'));

    expect((await decideCodexTool(folder(), at('cp docs/a.md docs/b.md'), check)).decision).toBe('allow');
    for (const command of ['cp docs/a.md docs/guide.md', 'cd docs && cp a.md guide.md']) {
      expect(await decideCodexTool(folder(), at(command), check), command).toMatchObject({
        decision: 'deny',
        why: 'it would change the folder’s own settings or instructions',
      });
    }
  });

  it('refuses a change to where a link among what decides a run leads, out of the folder too', async () => {
    // The folder's `.codex` is a link to settings kept elsewhere: Codex reads them through it.
    const project = join(dir, 'app');
    const shared = join(dir, 'shared', 'codex');
    mkdirSync(shared, { recursive: true });
    symlinkSync(shared, join(project, '.codex'));
    const check = rules({ cp: 'allow' });

    expect(
      await decideCodexTool(folder(), bash(`cp evil.rules ${join(shared, 'default.rules')}`), check)
    ).toMatchObject({ decision: 'deny', why: 'it would change the folder’s own settings or instructions' });
    expect(
      (await decideCodexTool(folder(), bash(`cp notes.md ${join(dir, 'shared', 'notes.md')}`), check)).decision
    ).toBe('allow');
  });

  it('refuses a change to where a link inside what decides a run leads', async () => {
    // `.codex` is the folder's own, and its config is a link to a file kept elsewhere in the project.
    const project = join(dir, 'app');
    const at = (command: string) => ({ ...bash(command), cwd: project });
    const check = rules({ cp: 'allow' });
    mkdirSync(join(project, '.codex'));
    writeFileSync(join(project, 'codex.toml'), '');
    symlinkSync('../codex.toml', join(project, '.codex', 'config.toml'));

    expect(await decideCodexTool(folder(), at('cp evil.toml codex.toml'), check)).toMatchObject({
      decision: 'deny',
      why: 'it would change the folder’s own settings or instructions',
    });
    expect((await decideCodexTool(folder(), at('cp a.md notes.md'), check)).decision).toBe('allow');
  });

  it('reads the folder’s skills without a rule, and nothing past them', async () => {
    const none = rules({});
    const project = join(dir, 'app');
    const at = (command: string) => ({ ...bash(command), cwd: project });
    symlinkSync(join(home, '.agentinbox'), join(project, '.agents', 'skills', 'hello', 'linked'));

    for (const command of [
      'cat .agents/skills/hello/SKILL.md',
      `sed -n '1,120p' .agents/skills/hello/SKILL.md`,
      'head -n 40 .agents/skills/hello/SKILL.md',
      'ls -la .agents/skills/hello',
    ]) {
      expect((await decideCodexTool(folder(), at(command), none)).decision).toBe('allow');
    }
    for (const command of [
      'cat .agents/skills/hello/../../../notes.txt',
      'cat .agents/skills/hello/linked/config.json',
      'sed -i s/a/b/ .agents/skills/hello/SKILL.md',
      './cat .agents/skills/hello/SKILL.md',
      'python3 .agents/skills/hello/run.py',
      'ls',
    ]) {
      expect((await decideCodexTool(folder(), at(command), none)).decision).toBe('deny');
    }
    // From where the command runs: after `cd docs`, the same words name another file.
    mkdirSync(join(project, 'docs'));
    const cd = rules({ cd: 'allow' });
    expect((await decideCodexTool(folder(), at('cd docs && cat .agents/skills/hello/SKILL.md'), cd)).decision).toBe(
      'deny'
    );
  });
});

describe('decideCodexTool: other tools', () => {
  const none = rules({});

  it('refuses edits, which no rule of Codex’s allows', async () => {
    expect(
      await decideCodexTool(
        folder(),
        { tool: 'apply_patch', input: { command: '*** Begin Patch\n*** Add File: notes.txt\n+hi\n*** End Patch' } },
        none
      )
    ).toEqual({ decision: 'deny', what: 'editing notes.txt', why: 'Codex has no rule that allows edits' });
  });

  it('lets the run’s own conversation tools and the folder’s MCP servers through, and no others', async () => {
    const mcp = (tool: string) => decideCodexTool(folder(), { tool, input: {} }, none);

    expect((await mcp('mcp__this_conversation__read')).decision).toBe('allow');
    expect((await mcp('mcp__docs__search')).decision).toBe('allow');
    expect(await mcp('mcp__AgentInbox__inbox_send')).toEqual({
      decision: 'deny',
      what: 'inbox_send of AgentInbox',
      why: 'that MCP server isn’t the folder’s',
    });
    expect(
      (await decideCodexTool(folder(), { tool: 'read_mcp_resource', input: { server: 'github' } }, none)).decision
    ).toBe('deny');
  });

  it('lets through what only plans or asks the person, and what the folder turns on itself', async () => {
    const tool = (name: string, more: Partial<CodexFolder> = {}) =>
      decideCodexTool(folder(more), { tool: name, input: {} }, none);

    expect((await tool('update_plan')).decision).toBe('allow');
    expect((await tool('request_user_input')).decision).toBe('allow');
    expect((await tool('view_image')).decision).toBe('deny');
    expect((await tool('view_image', { features: ['view_image'] })).decision).toBe('allow');
    expect((await tool('web_search')).decision).toBe('deny');
    expect((await tool('web_search', { webSearch: 'live' })).decision).toBe('allow');
    expect(await tool('spawn_agent')).toEqual({
      decision: 'deny',
      what: 'spawn_agent',
      why: 'the folder’s Codex settings don’t turn it on',
    });
  });
});

describe('codexHookAnswer', () => {
  const env = (more: Partial<CodexFolder> = {}) => ({
    [FOLDER_VARIABLE]: JSON.stringify({ folder: folder(more), codex: { command: 'codex', args: [] } }),
  });
  const call = (command: string) =>
    JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: join(dir, 'app'), session_id: 'thread_1' });

  it('refuses with Codex’s hook answer, and says nothing to let Codex go on', async () => {
    const check = rules({ 'npm test': 'allow', 'npm publish': 'prompt' });

    expect(JSON.parse(await codexHookAnswer(call('echo hi'), env(), check))).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: refusalOf({
          decision: 'deny',
          what: '`echo hi`',
          why: 'no rule in the folder’s Codex settings allows it',
        }),
      },
    });
    expect(await codexHookAnswer(call('npm test'), env(), check)).toBe('');
    // Codex asks the listener itself, which goes by the same rules.
    expect(await codexHookAnswer(call('npm publish'), env(), check)).toBe('');
  });

  it('refuses whatever it can’t read, or when the listener didn’t say what the folder allows', async () => {
    const reason = async (input: string, given: NodeJS.ProcessEnv) =>
      JSON.parse(await codexHookAnswer(input, given, rules({ 'npm test': 'allow' }))).hookSpecificOutput
        .permissionDecisionReason;

    expect(await reason(call('npm test'), {})).toMatch(/^Refused: Bash, as the check didn’t work/);
    expect(await reason('not json', env())).toMatch(/^Refused: this tool call, as the check didn’t work/);
    expect(
      await reason(call('npm test'), { [FOLDER_VARIABLE]: JSON.stringify({ codex: { command: 'codex', args: [] } }) })
    ).toContain('the listener didn’t say what this folder allows');
  });
});

describe('the check’s words and flags', () => {
  it('reads back what it refused and why', () => {
    const text = refusalOf({
      decision: 'deny',
      what: '`cat .env`',
      why: 'no rule in the folder’s Codex settings allows it',
    });

    expect(readRefusal(text)).toEqual({
      what: '`cat .env`',
      why: 'no rule in the folder’s Codex settings allows it',
    });
    expect(readRefusal('Some other hook said no.')).toBeUndefined();
  });

  it('gives Codex the hook, then trusts it by its hash and turns the operator’s own hooks off', () => {
    const check = shellLine({ command: '/usr/local/bin/node', args: ['/opt/agent inbox/index.js', 'contact-check'] });

    expect(check).toBe(`/usr/local/bin/node '/opt/agent inbox/index.js' contact-check`);
    expect(contactHookFlags(check)).toEqual([
      '-c',
      'features.hooks=true',
      '-c',
      `hooks.PreToolUse=[{matcher="*",hooks=[{type="command",command=${JSON.stringify(check)},timeout=60}]}]`,
    ]);
    expect(
      contactHookFlags(check, {
        hook: { key: '/<session-flags>/config.toml:pre_tool_use:0:0', currentHash: 'sha256:1' },
        off: ['/u.toml:x:0:0'],
      }).at(-1)
    ).toBe(
      'hooks.state={"/<session-flags>/config.toml:pre_tool_use:0:0"={trusted_hash="sha256:1"},"/u.toml:x:0:0"={enabled=false}}'
    );
  });

  it('checks a command’s words with `codex execpolicy check`, the strictest rule winning', async () => {
    const file = join(dir, 'default.rules');
    writeFileSync(
      file,
      [
        'prefix_rule(pattern = ["git"], decision = "allow")',
        'prefix_rule(pattern = ["git", "push"], decision = "prompt")',
      ].join('\n')
    );
    const check = execPolicyCheck({ command: process.execPath, args: [FAKE_CODEX] }, [file]);

    expect(await check(['git', 'status'])).toEqual({ decision: 'allow', prefixes: [['git']] });
    expect(await check(['git', 'push', 'origin'])).toEqual({
      decision: 'prompt',
      prefixes: [['git'], ['git', 'push']],
    });
    expect(await check(['npm', 'test'])).toEqual({ prefixes: [] });
    expect(await execPolicyCheck({ command: 'codex', args: [] }, [])(['git', 'status'])).toEqual({ prefixes: [] });
  });
});
