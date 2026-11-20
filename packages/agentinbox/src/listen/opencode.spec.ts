import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HostAnswer,
  HostQuestion,
  HostSession,
  PermissionAnswer,
  PermissionQuestion,
  TurnEnded,
} from './host-adapter';
import { NOBODY_ANSWERED } from './host-program';
import {
  type Asked,
  ascendingId,
  describePermission,
  driven,
  keysNamedIn,
  mcpToolOf,
  OPENCODE_MISSING_HELP,
  opencode,
  type Rule,
  serverUrlIn,
  sessionRules,
  sessionScope,
  turnEndOf,
  versionIn,
} from './opencode';

const FAKE_OPENCODE = fileURLToPath(new URL('./fake-opencode.fixture.mjs', import.meta.url));

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'listen-opencode-'));
  vi.stubEnv('FAKE_OPENCODE_SESSIONS', join(dir, 'sessions'));
  vi.stubEnv('FAKE_OPENCODE_LOG', join(dir, 'opencode.log'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** An `opencode` on a PATH of its own: the fake, behind a small launcher. */
function installFake(): string {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const file = join(bin, 'opencode');
  writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_OPENCODE}" "$@"\n`);
  chmodSync(file, 0o755);

  return bin;
}

/** What the fake logged: each start, each session it opened, each message. */
function logged(event: string): Array<Record<string, unknown>> {
  try {
    return readFileSync(join(dir, 'opencode.log'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.event === event);
  } catch {
    return [];
  }
}

interface Told {
  turns: TurnEnded[];
  progress: string[];
  subjects: PermissionQuestion['subject'][];
  started: string[];
  ended: string[];
  asked: PermissionQuestion[];
  questions: HostQuestion[];
  lost: Array<{ error: string; sessionGone: boolean }>;
}

/** A session of the fake `opencode serve`, with what it told the core. */
function open(
  options: {
    resume?: string;
    permission?: (question: PermissionQuestion, signal: AbortSignal) => Promise<PermissionAnswer>;
    question?: (question: HostQuestion) => Promise<HostAnswer | undefined>;
  } = {}
): { session: HostSession; told: Told; turn: () => Promise<TurnEnded>; lost: () => Promise<void> } {
  const told: Told = {
    turns: [],
    progress: [],
    subjects: [],
    started: [],
    ended: [],
    asked: [],
    questions: [],
    lost: [],
  };
  const waiting: Array<(turn: TurnEnded) => void> = [];
  const losing: Array<() => void> = [];
  const session = opencode.open(
    {
      program: { command: process.execPath, args: [FAKE_OPENCODE] },
      project: dir,
      resume: options.resume,
      instructions: 'Agent Inbox started you.',
    },
    {
      progress: (note, subject, toolId) => {
        told.progress.push(note);
        told.subjects.push(subject);
        if (toolId) {
          told.started.push(toolId);
        }
      },
      toolEnded: (toolId) => told.ended.push(toolId),
      turnEnded: (turn) => {
        told.turns.push(turn);
        waiting.shift()?.(turn);
      },
      askPermission: async (question, signal) => {
        told.asked.push(question);

        return options.permission ? options.permission(question, signal) : { optionId: 'allow' };
      },
      askQuestion: async (question) => {
        told.questions.push(question);

        return options.question ? options.question(question) : undefined;
      },
      lost: (error, sessionGone) => {
        told.lost.push({ error, sessionGone });
        losing.shift()?.();
      },
    }
  );
  const turn = () =>
    new Promise<TurnEnded>((resolve) => {
      waiting.push(resolve);
    });
  const lost = () =>
    new Promise<void>((resolve) => {
      losing.push(resolve);
    });

  return { session, told, turn, lost };
}

function message(id: string, words: string) {
  return { id, text: `New message in conv_1 (telegram) from your operator:\n\n${words}` };
}

const ALLOW = { id: 'allow', label: 'Allow', kind: 'allow_once' };
const ALLOW_SESSION = { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' };
const DENY = { id: 'deny', label: 'Deny', kind: 'deny' };

/** OpenCode's own defaults, as its agent has them: everything allowed, outside the project asked about. */
const OPENCODE_DEFAULTS: Rule[] = [
  { name: '*', pattern: '*', effect: 'allow' },
  { name: 'external_directory', pattern: '*', effect: 'ask' },
  { name: 'external_directory', pattern: '/tmp/opencode/*', effect: 'allow' },
];

describe('versionIn and driven', () => {
  it('reads both ways OpenCode prints its version', () => {
    expect(versionIn('1.19.5\n')).toEqual({ text: '1.19.5', major: 1, minor: 19 });
    expect(versionIn('opencode v2.2.0\n')).toEqual({ text: '2.2.0', major: 2, minor: 2 });
    expect(versionIn('no version')).toBeUndefined();
  });

  it('drives OpenCode 1.19 and later, and OpenCode 2.2 and later', () => {
    expect(driven({ major: 1, minor: 19 })).toBe(true);
    expect(driven({ major: 1, minor: 18 })).toBe(false);
    expect(driven({ major: 2, minor: 1 })).toBe(false);
    expect(driven({ major: 2, minor: 2 })).toBe(true);
    expect(driven({ major: 3, minor: 0 })).toBe(true);
    expect(driven({ major: 0, minor: 99 })).toBe(false);
  });
});

describe('sessionRules', () => {
  it('asks before the shell, the web and MCP tools, and turns off Code Mode and OpenCode 1’s subagents', () => {
    expect(sessionRules(1, OPENCODE_DEFAULTS)).toEqual([
      { name: 'bash', pattern: '*', effect: 'ask' },
      { name: 'webfetch', pattern: '*', effect: 'ask' },
      { name: 'websearch', pattern: '*', effect: 'ask' },
      { name: '*_*', pattern: '*', effect: 'ask' },
      { name: 'external_directory', pattern: '*', effect: 'ask' },
      { name: 'external_directory', pattern: '/tmp/opencode/*', effect: 'allow' },
      { name: 'execute', pattern: '*', effect: 'deny' },
      { name: 'task', pattern: '*', effect: 'deny' },
    ]);
  });

  it('names OpenCode 2’s shell as it does, and leaves its subagents, which keep the session’s rules', () => {
    expect(sessionRules(2, [])).toEqual([
      { name: 'shell', pattern: '*', effect: 'ask' },
      { name: 'webfetch', pattern: '*', effect: 'ask' },
      { name: 'websearch', pattern: '*', effect: 'ask' },
      { name: '*_*', pattern: '*', effect: 'ask' },
      { name: 'execute', pattern: '*', effect: 'deny' },
    ]);
  });

  it('puts the operator’s own rules after its asks, so they still decide what they name', () => {
    const own: Rule[] = [
      { name: 'bash', pattern: 'git *', effect: 'allow' },
      { name: 'bash', pattern: 'rm *', effect: 'deny' },
    ];

    expect(sessionRules(1, [...OPENCODE_DEFAULTS, ...own]).slice(-4, -2)).toEqual(own);
  });

  it('keeps Code Mode and OpenCode 1’s subagents off whatever the operator’s rules say, since neither can ask', () => {
    const own: Rule[] = [
      { name: '*', pattern: '*', effect: 'ask' },
      { name: 'execute', pattern: '*', effect: 'allow' },
      { name: 'task', pattern: '*', effect: 'allow' },
    ];

    expect(sessionRules(1, own).slice(-2)).toEqual([
      { name: 'execute', pattern: '*', effect: 'deny' },
      { name: 'task', pattern: '*', effect: 'deny' },
    ]);
    expect(sessionRules(2, own).at(-1)).toEqual({ name: 'execute', pattern: '*', effect: 'deny' });
  });
});

describe('mcpToolOf', () => {
  it('splits a tool’s name into its server and tool, by the servers OpenCode has', () => {
    expect(mcpToolOf('AgentInbox_inbox_reply', ['AgentInbox'])).toEqual({ server: 'AgentInbox', tool: 'inbox_reply' });
    expect(mcpToolOf('git_hub_create_issue', ['git', 'git hub'])).toEqual({ server: 'git hub', tool: 'create_issue' });
    expect(mcpToolOf('bash', ['AgentInbox'])).toBeUndefined();
  });
});

describe('ascendingId', () => {
  it('is made as OpenCode makes its ids, so each sorts after the ones before', () => {
    const first = ascendingId('msg', 1_793_272_008_072);
    const second = ascendingId('msg', 1_793_272_008_072);
    const later = ascendingId('msg', 1_793_272_008_073);

    expect(first).toMatch(/^msg_187574d88001[0-9A-Za-z]{14}$/);
    expect(second.slice(0, 16)).toBe('msg_187574d88002');
    expect([later, second, first].sort()).toEqual([first, second, later]);
  });
});

describe('keysNamedIn', () => {
  it('names the keys from this shell that `opencode auth list` says it signs in with', () => {
    const listed = '┌  Environment\n●  Anthropic \u001b[90mANTHROPIC_API_KEY\n└  1 environment variable\n';

    expect(keysNamedIn(listed, { ANTHROPIC_API_KEY: 'sk-1', OPENAI_API_KEY: 'sk-2', PATH: '/bin' })).toEqual([
      'ANTHROPIC_API_KEY',
    ]);
    expect(keysNamedIn('Anthropic  ANTHROPIC_API_KEY  environment\n', { ANTHROPIC_API_KEY: ' ' })).toEqual([]);
  });
});

describe('describePermission', () => {
  const asked = (fields: Partial<Asked>): Asked => ({
    id: 'per_1',
    sessionId: 'ses_1',
    name: 'bash',
    patterns: [],
    always: [],
    metadata: {},
    ...fields,
  });
  const context = { inputs: new Map<string, Record<string, unknown>>(), mcpServers: ['AgentInbox'] };

  it('shows the whole command, from what OpenCode 1 says or OpenCode 2’s tool was given', () => {
    expect(
      describePermission(
        asked({ patterns: ['git status', 'npm test'], metadata: { command: 'git status && npm test' } }),
        context
      )
    ).toEqual({
      subject: { kind: 'command', command: 'git status && npm test' },
      action: 'run `git status && npm test`',
      brief: 'run a command',
      details: [],
    });

    const inputs = new Map([['call_1', { command: 'npm publish' }]]);
    expect(
      describePermission(asked({ name: 'shell', patterns: ['npm publish'], callId: 'call_1' }), { ...context, inputs })
        .subject
    ).toEqual({ kind: 'command', command: 'npm publish' });
  });

  it('says where a command runs when the agent named a folder for it', () => {
    const inputs = new Map([['call_1', { command: 'npm test', workdir: 'web' }]]);

    expect(
      describePermission(asked({ patterns: ['npm test'], callId: 'call_1' }), { ...context, inputs }).subject
    ).toEqual({ kind: 'command', command: 'npm test', cwd: 'web' });
  });

  it('names what an MCP tool is called with, from its call when OpenCode 1 doesn’t say', () => {
    const inputs = new Map([['call_2', { conversation: 'conv_1', message: 'hi' }]]);

    expect(
      describePermission(asked({ name: 'AgentInbox_inbox_reply', patterns: ['*'], callId: 'call_2' }), {
        ...context,
        inputs,
      })
    ).toEqual({
      subject: {
        kind: 'mcp',
        server: 'AgentInbox',
        tool: 'inbox_reply',
        input: { conversation: 'conv_1', message: 'hi' },
      },
      action: 'use inbox_reply from AgentInbox with conversation "conv_1", message "hi"',
      brief: 'use inbox_reply from AgentInbox',
      details: [],
    });
  });

  it('says where the web and other folders it reaches are', () => {
    expect(describePermission(asked({ name: 'webfetch', patterns: ['https://example.com/a'] }), context)).toMatchObject(
      {
        subject: { kind: 'network', hosts: ['example.com'] },
        action: 'fetch https://example.com/a',
      }
    );
    expect(
      describePermission(
        asked({ name: 'external_directory', patterns: ['/etc/*'], metadata: { parentDir: '/etc' } }),
        context
      )
    ).toMatchObject({ subject: { kind: 'files', paths: ['/etc'] }, action: 'work in /etc, outside the project' });
    expect(describePermission(asked({ name: 'read', patterns: ['.env'] }), context)).toMatchObject({
      subject: { kind: 'files', paths: ['.env'] },
      action: 'read .env',
      brief: 'read a file',
    });
  });

  it('names any other tool by its name, and keeps OpenCode’s own words about why', () => {
    expect(
      describePermission(asked({ name: 'lsp', patterns: ['*'], message: 'A plugin asks for this' }), context)
    ).toEqual({
      subject: { kind: 'tool', name: 'lsp' },
      action: 'use lsp',
      brief: 'use lsp',
      details: ['A plugin asks for this.'],
    });
  });
});

describe('turnEndOf', () => {
  const user = { info: { id: 'msg_2', role: 'user' }, parts: [{ type: 'text', text: 'hi' }] };
  const before = { info: { id: 'msg_1', role: 'assistant' }, parts: [{ type: 'text', text: 'Earlier.' }] };

  it('answers with the last words written after the turn’s own message', () => {
    const messages = [
      before,
      user,
      { info: { id: 'msg_3', role: 'assistant' }, parts: [{ type: 'text', text: 'Looking.' }, { type: 'tool' }] },
      { info: { id: 'msg_4', role: 'assistant' }, parts: [{ type: 'text', text: 'Done.' }] },
    ];

    expect(turnEndOf(['m1'], 'msg_2', messages, { stopped: false })).toEqual({
      inputIds: ['m1'],
      outcome: 'completed',
      text: 'Done.',
    });
  });

  it('says a stopped turn stopped, and a failed one why', () => {
    const aborted = { info: { id: 'msg_3', role: 'assistant', error: { name: 'MessageAbortedError' } }, parts: [] };
    const failed = {
      info: { id: 'msg_3', role: 'assistant', error: { name: 'APIError', data: { message: 'Rate limited.' } } },
      parts: [],
    };

    expect(turnEndOf(['m1'], 'msg_2', [user, aborted], { stopped: false }).outcome).toBe('interrupted');
    expect(turnEndOf(['m1'], 'msg_2', [user, failed], { stopped: false })).toEqual({
      inputIds: ['m1'],
      outcome: 'failed',
      error: 'Rate limited.',
    });
    expect(turnEndOf(['m1'], 'msg_9', [before], { stopped: false, error: 'No model.' })).toEqual({
      inputIds: ['m1'],
      outcome: 'failed',
      error: 'No model.',
    });
  });
});

describe('sessionScope', () => {
  it('says what OpenCode 1’s “always” lets through, which can be more than the one request', () => {
    expect(sessionScope(['npm test *'])).toBe(
      'Allow for this session lets `npm test *` through until the session ends.'
    );
    expect(sessionScope(['*'])).toBe(
      'Allow for this session lets every request of this kind through until the session ends.'
    );
  });
});

describe('serverUrlIn', () => {
  it('reads where either OpenCode’s server listens', () => {
    expect(serverUrlIn('opencode server listening on http://127.0.0.1:4096')).toBe('http://127.0.0.1:4096');
    expect(serverUrlIn('{"url":"http://127.0.0.1:4097"}')).toBe('http://127.0.0.1:4097');
    expect(serverUrlIn('Warning: OPENCODE_SERVER_PASSWORD is not set')).toBeUndefined();
  });
});

describe('OpenCode’s settings from the shell', () => {
  it('keeps where OpenCode keeps its config and data, never a secret nor config written inline', () => {
    expect(
      opencode.settingsIn({
        OPENCODE_CONFIG: '/Users/ada/opencode.json',
        OPENCODE_DISABLE_AUTOUPDATE: '1',
        XDG_DATA_HOME: '/Users/ada/.data',
        AWS_PROFILE: 'work',
        OPENCODE_CONFIG_CONTENT: '{"provider":{"x":{"options":{"apiKey":"sk"}}}}',
        OPENCODE_API_KEY: 'sk-secret',
        OPENCODE_SERVER_PASSWORD: 'secret',
        ANTHROPIC_API_KEY: 'sk-secret',
        PATH: '/bin',
      })
    ).toEqual({
      OPENCODE_CONFIG: '/Users/ada/opencode.json',
      OPENCODE_DISABLE_AUTOUPDATE: '1',
      XDG_DATA_HOME: '/Users/ada/.data',
      AWS_PROFILE: 'work',
    });
  });
});

describe('opencode.check', () => {
  it('finds opencode on the PATH and its version', async () => {
    const bin = installFake();

    expect(await opencode.check(dir, { PATH: bin, HOME: dir })).toEqual({
      ok: true,
      program: { command: join(bin, 'opencode'), args: [] },
      version: '1.19.5',
      warnings: [],
      secrets: [],
    });
  });

  it('names the keys from the shell it signs in with, for OpenCode 1 and 2', async () => {
    const bin = installFake();

    for (const version of ['1.19.5', '2.2.0']) {
      expect(
        await opencode.check(dir, { PATH: bin, HOME: dir, FAKE_OPENCODE_VERSION: version, ANTHROPIC_API_KEY: 'sk' })
      ).toMatchObject({ ok: true, version, secrets: ['ANTHROPIC_API_KEY'] });
    }
  });

  it('says how to install OpenCode when it isn’t there', async () => {
    vi.stubEnv('HOME', dir);

    expect(await opencode.check(dir, { PATH: join(dir, 'nowhere') })).toEqual({
      ok: false,
      message: OPENCODE_MISSING_HELP,
    });
    expect(OPENCODE_MISSING_HELP).toContain('curl -fsSL https://opencode.ai/install | bash');
  });

  it('says so when opencode is there but doesn’t start', async () => {
    const file = join(dir, 'opencode');
    writeFileSync(file, '#!/bin/sh\necho "broken install" >&2\nexit 3\n');
    chmodSync(file, 0o755);

    const checked = await opencode.check(dir, { PATH: dir });

    expect(checked.ok === false && checked.message).toContain('didn’t start: broken install');
  });

  it('asks to update an OpenCode older than the listener drives', async () => {
    const bin = installFake();

    const checked = await opencode.check(dir, { PATH: bin, HOME: dir, FAKE_OPENCODE_VERSION: '1.18.35' });

    expect(checked.ok === false && checked.message).toContain('OpenCode 1.18.35 at');
    expect(checked.ok === false && checked.message).toContain('Update it with `opencode upgrade`');
  });
});

describe.each([
  ['OpenCode 1', '1.19.5'],
  ['OpenCode 2', '2.2.0'],
])('a session of %s', { timeout: 15_000 }, (_name, version) => {
  const major = Number(version[0]);

  beforeEach(() => {
    vi.stubEnv('FAKE_OPENCODE_VERSION', version);
  });

  it('opens a session in the project under the listener’s rules, and reports each turn', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'hello'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'completed', text: 'Echo: hello' });
    expect(session.id).toMatch(/^ses_/);
    expect(logged('start')).toEqual([
      {
        event: 'start',
        argv:
          major === 1
            ? ['serve', '--hostname', '127.0.0.1', '--port', '0']
            : ['serve', '--stdio', '--hostname', '127.0.0.1'],
        cwd: expect.stringContaining('listen-opencode-'),
      },
    ]);
    expect(logged('session')[0]).toMatchObject({
      method: 'create',
      rules: sessionRules(major as 1 | 2, OPENCODE_DEFAULTS),
    });
    await session.close();
    expect(told.lost).toEqual([]);
  });

  it('gives the agent the listener’s instructions', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'instructions'));

    expect((await turn()).text).toBe('Instructions: Agent Inbox started you.');
    await session.close();
  });

  it('asks before a shell command, showing the command, and what an allow for the session would let through', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Ran npm publish (once).');
    expect(told.asked[0]).toEqual({
      subject: { kind: 'command', command: 'npm publish' },
      action: 'run `npm publish`',
      brief: 'run a command',
      details: major === 1 ? ['Allow for this session lets `npm *` through until the session ends.'] : [],
      options: major === 1 ? [ALLOW, ALLOW_SESSION, DENY] : [ALLOW, DENY],
    });
    await session.close();
  });

  it('denies, and tells the agent what the operator said', async () => {
    const { session, turn } = open({
      permission: async () => ({ optionId: 'deny', message: 'Your operator said no.' }),
    });

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Not allowed (reject). Told: Your operator said no.');
    await session.close();
  });

  it('asks before it fetches from the web, and before it works outside the project', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'fetch:https://registry.npmjs.org/x'));
    expect((await turn()).text).toBe('Fetched https://registry.npmjs.org/x (once).');
    session.send(message('m2', 'outside:/etc'));
    expect((await turn()).text).toBe('Worked in /etc (once).');

    expect(told.asked.map(({ subject, action }) => ({ subject, action }))).toEqual([
      { subject: { kind: 'network', hosts: ['registry.npmjs.org'] }, action: 'fetch https://registry.npmjs.org/x' },
      { subject: { kind: 'files', paths: ['/etc'] }, action: 'work in /etc, outside the project' },
    ]);
    await session.close();
  });

  it('asks before an MCP tool, with what it is called with', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'mcp:create_issue'));

    expect((await turn()).text).toBe('Used create_issue (once).');
    expect(told.asked[0]).toMatchObject({
      subject: {
        kind: 'mcp',
        server: 'AgentInbox',
        tool: 'create_issue',
        input: { conversation: 'conv_1', message: 'I replied through MCP.' },
      },
      action: 'use create_issue from AgentInbox with conversation "conv_1", message "I replied through MCP."',
    });
    await session.close();
  });

  it('puts its questions to the core, and passes the answers back', async () => {
    const { session, told, turn } = open({
      question: async (asked) => ({ answers: { [asked.questions[0].id]: ['Production'] } }),
    });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toBe(major === 1 ? 'Answers: [["Production"]]' : 'Answers: {"q0":"production"}');
    expect(told.progress).toEqual(['question: Which one?']);
    expect(told.questions[0]).toEqual({
      questions: [
        { id: major === 1 ? '0' : 'q0', text: 'Which one?', options: ['Staging', 'Production'], multiple: false },
      ],
    });
    expect(told.asked).toHaveLength(0);
    await session.close();
  });

  it('tells the agent nobody answered its question', async () => {
    const { session, turn } = open({ question: async () => undefined });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toBe(
      major === 1 ? `Answers: ${JSON.stringify([[NOBODY_ANSWERED]])}` : `No answer: ${NOBODY_ANSWERED}`
    );
    await session.close();
  });

  it('says what each tool is, by its id, and when it ended', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'wait-for:100'));
    await turn();

    const shell = major === 1 ? 'bash' : 'shell';
    expect(told.progress).toEqual([`${shell}: npx @agentinbox/cli reply conv_1 ask "Staging or prod?"`]);
    expect(told.subjects).toEqual([
      { kind: 'command', command: 'npx @agentinbox/cli reply conv_1 ask "Staging or prod?"' },
    ]);
    expect(told.ended).toEqual(told.started);
    await session.close();
  });

  it('reports a turn that fails, with OpenCode’s reason', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'fail'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'failed', error: 'You have hit your usage limit.' });
    await session.close();
  });

  it('stops on interrupt, says so for each message, and takes back a question it waits on', async () => {
    let withdrawn: AbortSignal | undefined;
    const { session, told, turn } = open({
      permission: (_question, signal) =>
        new Promise((resolve) => {
          withdrawn = signal;
          signal.addEventListener('abort', () => resolve({ optionId: 'deny', message: 'The run was stopped.' }));
        }),
    });

    session.send(message('m1', 'ask:npm publish'));
    await vi.waitFor(() => expect(told.asked).toHaveLength(1));
    session.send(message('m2', 'and this'));
    await session.interrupt();

    await vi.waitFor(() => expect(told.turns.flatMap((each) => each.inputIds).sort()).toEqual(['m1', 'm2']));
    expect(told.turns.every((each) => each.outcome === 'interrupted')).toBe(true);
    expect(withdrawn?.aborted).toBe(true);
    await session.close();
    expect(told.lost).toEqual([]);
  });

  it('stops a session that is still opening without waiting for it, and says so for each message', async () => {
    vi.stubEnv('FAKE_OPENCODE_SLOW_START', '60000');
    const { session, told, turn } = open();

    session.send(message('m1', 'hello'));
    const ended = turn();
    const startedAt = Date.now();
    await session.interrupt();

    expect(await ended).toEqual({ inputIds: ['m1'], outcome: 'interrupted' });
    expect(Date.now() - startedAt).toBeLessThan(12_000);
    expect(told.lost).toEqual([]);
    await session.close();
  });

  it('starts no server once it is closed while OpenCode says its version', async () => {
    vi.stubEnv('FAKE_OPENCODE_SLOW_VERSION', '500');
    const { session, told } = open();

    await session.close();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(logged('start')).toEqual([]);
    expect(told.lost).toEqual([]);
  });

  it('goes on with a session under the rules of now, and says when that session is gone', async () => {
    const first = open();
    first.session.send(message('m1', 'hello'));
    await first.turn();
    const kept = first.session.id;
    await first.session.close();

    const again = open({ resume: kept });
    again.session.send(message('m2', 'remember'));
    expect((await again.turn()).text).toBe('This session has seen 1 messages before.');
    expect(again.session.id).toBe(kept);
    expect(logged('session').map((entry) => entry.method)).toEqual(['create', 'resume']);
    await again.session.close();

    const gone = open({ resume: 'ses_000000000000AAAAAAAAAAAAAA' });
    const lost = gone.lost();
    gone.session.send(message('m3', 'hello'));
    await lost;
    expect(gone.told.lost).toEqual([
      { error: 'OpenCode no longer has session ses_000000000000AAAAAAAAAAAAAA.', sessionGone: true },
    ]);
    await gone.session.close();
  });

  it('says it is lost when OpenCode ends in the middle of a turn', async () => {
    vi.stubEnv('FAKE_OPENCODE_CRASH', '1');
    const { session, told, lost } = open();

    const ended = lost();
    session.send(message('m1', 'hello'));
    await ended;

    expect(told.lost[0]).toMatchObject({ sessionGone: false });
    expect(told.lost[0].error).toContain('panic: the fake crashed');
    await session.close();
  });

  it('leaves out the marks of a session listen was started from', async () => {
    vi.stubEnv('CLAUDECODE', '1');
    vi.stubEnv('OPENCODE', '1');
    vi.stubEnv('OPENCODE_SESSION_ID', 'ses_parent');
    vi.stubEnv('INBOX_SECRET_KEY', 'sk_parent');
    const { session, turn } = open();

    session.send(message('m1', 'env'));

    expect((await turn()).text).toBe('Parent marks: none.');
    await session.close();
  });
});

describe('a session of OpenCode 1', { timeout: 15_000 }, () => {
  it('allows for the session when the operator does', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow_session' }) });

    session.send(message('m1', 'ask-twice:npm test'));

    expect((await turn()).text).toBe('Ran npm test twice, and was allowed for the session.');
    expect(told.asked).toHaveLength(1);
    await session.close();
  });

  it('takes a message that comes while it works in the next turn, once this one ended', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'sleep:600'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    session.send(message('m2', 'and this too'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'completed', text: 'Done sleeping.' });
    expect(await turn()).toEqual({ inputIds: ['m2'], outcome: 'completed', text: 'Echo: and this too' });
    expect(logged('prompt')).toHaveLength(2);
    await session.close();
  });

  it('sends what waited behind a turn as one message', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'sleep:600'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    session.send(message('m2', 'first'));
    session.send(message('m3', 'second'));
    await turn();

    expect(await turn()).toEqual({ inputIds: ['m2', 'm3'], outcome: 'completed', text: 'Echo: first Also: second' });
    await session.close();
  });
});

describe('a session of OpenCode 2', { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.stubEnv('FAKE_OPENCODE_VERSION', '2.2.0');
  });

  it('asks before a tool of an MCP server listed only once it started, and names it, as OpenCode says it started', async () => {
    vi.stubEnv('FAKE_OPENCODE_MCP_LATE', '1');
    const { session, told, turn } = open();

    session.send(message('m1', 'mcp:create_issue'));

    expect((await turn()).text).toBe('Used create_issue (once).');
    expect(told.subjects).toEqual([
      expect.objectContaining({ kind: 'mcp', server: 'AgentInbox', tool: 'create_issue' }),
    ]);
    expect(told.asked[0]?.subject).toMatchObject({ kind: 'mcp', server: 'AgentInbox', tool: 'create_issue' });
    await session.close();
  });

  it('names a tool of an MCP server it hasn’t heard of by listing the servers again when asked about it', async () => {
    vi.stubEnv('FAKE_OPENCODE_MCP_LATE', 'quiet');
    const { session, told, turn } = open();

    session.send(message('m1', 'mcp:create_issue'));

    expect((await turn()).text).toBe('Used create_issue (once).');
    expect(told.asked[0]?.subject).toMatchObject({ kind: 'mcp', server: 'AgentInbox', tool: 'create_issue' });
    await session.close();
  });

  it('keeps the listener’s instructions with the session', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'hello'));
    await turn();

    expect(logged('instructions')).toEqual([
      { event: 'instructions', key: 'agentinbox', value: 'Agent Inbox started you.' },
    ]);
    await session.close();
  });

  it('steers a message that comes while it works into the same turn', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'sleep:600'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    session.send(message('m2', 'and this too'));

    expect(await turn()).toEqual({
      inputIds: ['m1', 'm2'],
      outcome: 'completed',
      text: 'Done sleeping. Also: and this too',
    });
    expect(logged('prompt').map((entry) => entry.delivery)).toEqual(['steer', 'steer']);
    await session.close();
  });

  it('takes back what waits in the inbox when it stops', async () => {
    const { session, told } = open();

    session.send(message('m1', 'sleep:5000'));
    await vi.waitFor(() => expect(logged('prompt')).toHaveLength(1));
    session.send(message('m2', 'queued'));
    await vi.waitFor(() => expect(logged('prompt')).toHaveLength(2));
    await session.interrupt();

    await vi.waitFor(() => expect(told.turns.flatMap((each) => each.inputIds).sort()).toEqual(['m1', 'm2']));
    expect(told.turns.every((each) => each.outcome === 'interrupted')).toBe(true);
    expect(logged('withdrawn')).toHaveLength(1);
    await session.close();
  });

  it('drops what waits to be handed over when it stops, so it starts no turn after the stop', async () => {
    vi.stubEnv('FAKE_OPENCODE_SLOW_REPLY', '800');
    const { session, told } = open();

    session.send(message('m1', 'sleep:5000'));
    await vi.waitFor(() => expect(logged('prompt')).toHaveLength(1));
    // OpenCode hasn't answered the first prompt yet, so this one waits to be handed over.
    session.send(message('m2', 'queued'));
    await session.interrupt();
    await new Promise((resolve) => setTimeout(resolve, 1200));

    expect(told.turns.flatMap((each) => each.inputIds).sort()).toEqual(['m1', 'm2']);
    expect(told.turns.every((each) => each.outcome === 'interrupted')).toBe(true);
    expect(logged('prompt')).toHaveLength(1);
    await session.close();
  });

  it('declines a form that isn’t a question, without asking anyone', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'form'));

    expect((await turn()).text).toBe('Form: declined (Agent Inbox can’t fill in forms for you. Go on without it.)');
    expect(told.asked).toEqual([]);
    expect(told.questions).toEqual([]);
    await session.close();
  });
});
