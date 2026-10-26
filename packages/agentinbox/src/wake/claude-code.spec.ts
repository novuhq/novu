import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAUDE_CODE_MISSING_HELP,
  CLAUDE_CODE_SIGNED_OUT_HELP,
  claudeArgs,
  claudeCode,
  describeAction,
  describeBrief,
  sessionEnv,
  subjectOf,
  untrustedProject,
} from './claude-code';
import type {
  HostAnswer,
  HostQuestion,
  HostSession,
  PermissionAnswer,
  PermissionQuestion,
  TurnEnded,
} from './host-adapter';

const FAKE_CLAUDE = fileURLToPath(new URL('./fake-claude.fixture.mjs', import.meta.url));

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wake-claude-'));
  vi.stubEnv('FAKE_CLAUDE_SESSIONS', join(dir, 'sessions'));
  vi.stubEnv('FAKE_CLAUDE_LOG', join(dir, 'claude.log'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** A `claude` on a PATH of its own: the fake, behind a small launcher. */
function installFake(): string {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const file = join(bin, 'claude');
  writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_CLAUDE}" "$@"\n`);
  chmodSync(file, 0o755);

  return bin;
}

interface Told {
  turns: TurnEnded[];
  progress: string[];
  subjects: PermissionQuestion['subject'][];
  /** The ids of the tools it started, and of those that ended. */
  started: string[];
  ended: string[];
  asked: PermissionQuestion[];
  questions: HostQuestion[];
  lost: Array<{ error: string; sessionGone: boolean }>;
}

/** A session of the fake `claude`, with what it told the core. */
function open(
  options: {
    resume?: string;
    permission?: (question: PermissionQuestion, signal: AbortSignal) => Promise<PermissionAnswer>;
    question?: (question: HostQuestion) => Promise<HostAnswer | undefined>;
  } = {}
): { session: HostSession; told: Told; turn: () => Promise<TurnEnded> } {
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
  const session = claudeCode.open(
    {
      program: { command: process.execPath, args: [FAKE_CLAUDE] },
      project: dir,
      resume: options.resume,
      instructions: 'You were woken.',
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
      lost: (error, sessionGone) => told.lost.push({ error, sessionGone }),
    }
  );
  const turn = () =>
    new Promise<TurnEnded>((resolve) => {
      waiting.push(resolve);
    });

  return { session, told, turn };
}

function message(id: string, words: string) {
  return { id, text: `New message in conv_1 (telegram) from your operator:\n\n${words}` };
}

describe('claudeArgs', () => {
  it('drives print mode with stream-json both ways, asks this program, and accepts edits in the project', () => {
    expect(claudeArgs({ instructions: 'Woken.', sessionId: 'abc', resume: false })).toEqual([
      '-p',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'acceptEdits',
      '--permission-prompts',
      'host',
      '--permission-prompt-tool',
      'stdio',
      '--append-system-prompt',
      'Woken.',
      '--session-id',
      'abc',
    ]);
  });

  it('goes on with a session it is given', () => {
    expect(claudeArgs({ instructions: 'Woken.', sessionId: 'abc', resume: true }).slice(-2)).toEqual([
      '--resume',
      'abc',
    ]);
  });
});

describe('describeAction and subjectOf', () => {
  it('say what Claude Code wants to do, for the operator and for the core', () => {
    expect(describeAction({ tool_name: 'Bash', input: { command: 'npm publish' } })).toBe('run `npm publish`');
    // Whole, as it would run: the operator allows what they read.
    const long = `echo ${'x'.repeat(400)}\nrm -rf ~`;
    expect(describeAction({ tool_name: 'Bash', input: { command: long } })).toBe(`run \`${long}\``);
    const url = `https://example.com/?q=${'y'.repeat(400)}`;
    expect(describeAction({ tool_name: 'WebFetch', input: { url } })).toBe(`fetch ${url}`);
    expect(subjectOf({ tool_name: 'Bash', input: { command: 'npm publish' } })).toEqual({
      kind: 'command',
      command: 'npm publish',
    });
    const notes = join(homedir(), 'notes', 'todo.md');
    expect(describeAction({ tool_name: 'Edit', input: { file_path: notes } })).toBe('edit ~/notes/todo.md');
    expect(subjectOf({ tool_name: 'Edit', input: { file_path: notes } })).toEqual({ kind: 'files', paths: [notes] });
    expect(describeAction({ tool_name: 'WebFetch', input: { url: 'https://example.com/a' } })).toBe(
      'fetch https://example.com/a'
    );
    expect(subjectOf({ tool_name: 'WebFetch', input: { url: 'https://example.com/a' } })).toEqual({
      kind: 'network',
      hosts: ['example.com'],
    });
    expect(describeAction({ tool_name: 'WebSearch', input: { query: 'release notes' } })).toBe(
      'search the web for “release notes”'
    );
    expect(describeAction({ tool_name: 'Read', input: {}, blocked_path: '/etc/hosts' })).toBe('read /etc/hosts');
    expect(describeAction({ tool_name: 'mcp__github__create_issue', input: {} })).toBe('use create_issue from github');
    expect(subjectOf({ tool_name: 'mcp__github__create_issue', input: { title: 'Bug' } })).toEqual({
      kind: 'mcp',
      server: 'github',
      tool: 'create_issue',
      input: { title: 'Bug' },
    });
    expect(subjectOf({ tool_name: 'mcp__plugin_agentinbox_inbox__inbox_reply', input: {} })).toMatchObject({
      server: 'plugin_agentinbox_inbox',
      tool: 'inbox_reply',
    });
    expect(subjectOf({ tool_name: 'Task', input: {} })).toEqual({ kind: 'tool', name: 'Task' });
  });

  it('say it briefly too, for a card title the whole doesn’t fit', () => {
    expect(describeBrief({ tool_name: 'Bash', input: { command: 'npm publish' } })).toBe('run a command');
    expect(describeBrief({ tool_name: 'Write', input: { file_path: '/tmp/a' } })).toBe('edit a file');
    expect(describeBrief({ tool_name: 'Grep', input: {} })).toBe('read files');
    expect(describeBrief({ tool_name: 'WebFetch', input: { url: 'https://example.com/a' } })).toBe('fetch a web page');
    expect(describeBrief({ tool_name: 'WebSearch', input: { query: 'release notes' } })).toBe('search the web');
    expect(describeBrief({ tool_name: 'mcp__github__create_issue', input: {} })).toBe('use create_issue from github');
    expect(describeBrief({ tool_name: 'Task', input: {}, display_name: 'Agent' })).toBe('use Agent');
  });
});

describe('sessionEnv', () => {
  it('leaves out the marks of a session wake was started from, and keeps the rest', () => {
    expect(
      sessionEnv({
        PATH: '/bin',
        CLAUDECODE: '1',
        CLAUDE_CODE_SESSION_ID: 's',
        AI_AGENT: 'claude-code_2-1-310_agent',
        CODEX_THREAD_ID: 't',
        CLAUDE_CODE_USE_BEDROCK: '1',
        ANTHROPIC_MODEL: 'opus',
      })
    ).toEqual({ PATH: '/bin', CLAUDE_CODE_USE_BEDROCK: '1', ANTHROPIC_MODEL: 'opus' });
  });
});

describe('claudeCode.check', () => {
  it('finds claude on the PATH, its version, and that it is signed in', () => {
    const bin = installFake();

    const checked = claudeCode.check(dir, { PATH: bin, HOME: dir });

    expect(checked).toEqual({
      ok: true,
      program: { command: join(bin, 'claude'), args: [] },
      version: '2.1.310',
      warnings: [],
    });
  });

  it('says how to install Claude Code when it isn’t there', () => {
    vi.stubEnv('HOME', dir);

    expect(claudeCode.check(dir, { PATH: join(dir, 'nowhere') })).toEqual({
      ok: false,
      message: CLAUDE_CODE_MISSING_HELP,
    });
    expect(CLAUDE_CODE_MISSING_HELP).toContain('curl -fsSL https://claude.ai/install.sh | bash');
  });

  it('says so when claude is there but doesn’t start', () => {
    const file = join(dir, 'claude');
    writeFileSync(file, '#!/bin/sh\necho "broken install" >&2\nexit 3\n');
    chmodSync(file, 0o755);

    const checked = claudeCode.check(dir, { PATH: dir });

    expect(checked.ok === false && checked.message).toContain('didn’t start: broken install');
  });

  it('asks to sign in to Claude Code first', () => {
    const bin = installFake();

    expect(claudeCode.check(dir, { PATH: bin, FAKE_CLAUDE_SIGNED_OUT: '1' })).toEqual({
      ok: false,
      message: CLAUDE_CODE_SIGNED_OUT_HELP,
    });
  });

  it('warns when the project’s own allow list won’t apply, because Claude Code hasn’t trusted the folder', () => {
    const bin = installFake();
    const config = join(dir, 'config');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    mkdirSync(config, { recursive: true });
    writeFileSync(
      join(dir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Bash(npm test)'] } })
    );
    writeFileSync(join(config, '.claude.json'), JSON.stringify({ projects: {} }));

    const checked = claudeCode.check(dir, { PATH: bin, CLAUDE_CONFIG_DIR: config });

    expect(checked.ok && checked.warnings[0]).toContain('the project’s own allow list won’t apply until it is');

    writeFileSync(
      join(config, '.claude.json'),
      JSON.stringify({ projects: { [dir]: { hasTrustDialogAccepted: true } } })
    );
    expect(untrustedProject(dir, { CLAUDE_CONFIG_DIR: config })).toBe(false);
  });

  it('doesn’t warn for a project without an allow list of its own', () => {
    expect(untrustedProject(dir, { CLAUDE_CONFIG_DIR: join(dir, 'none') })).toBe(false);
  });
});

describe('a Claude Code session', { timeout: 15_000 }, () => {
  it('names its session up front, and reports each turn with the inputs it answered', async () => {
    const { session, told, turn } = open();

    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    session.send(message('m1', 'hello'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'completed', text: 'Echo: hello' });
    await session.close();
    expect(told.lost).toEqual([]);
  });

  it('asks before a tool its settings don’t allow, offering "Allow for this session" when Claude Code can keep it', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow' }) });

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Ran npm publish.');
    expect(told.asked[0]).toEqual({
      subject: { kind: 'command', command: 'npm publish' },
      action: 'run `npm publish`',
      brief: 'run a command',
      details: ['Run npm publish.'],
      options: [
        { id: 'allow', label: 'Allow', kind: 'allow_once' },
        { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' },
        { id: 'deny', label: 'Deny', kind: 'deny' },
      ],
    });
    await session.close();
  });

  it('passes a deny back with its message', async () => {
    const { session, turn } = open({
      permission: async () => ({ optionId: 'deny', message: 'Your operator said no.' }),
    });

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Not allowed: Your operator said no.');
    await session.close();
  });

  it('keeps an allow for the session as a rule for this session only', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow_session' }) });

    session.send(message('m1', 'ask-twice:npm test'));

    expect((await turn()).text).toBe('Ran npm test twice, and was allowed for the session.');
    expect(told.asked).toHaveLength(1);
    await session.close();
  });

  it('puts "ask the user" questions to the core as questions, and passes the answers back', async () => {
    const { session, told, turn } = open({ question: async () => ({ answers: { 'Which one?': ['Production'] } }) });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toBe('Answers: {"Which one?":"Production"}');
    expect(told.questions[0]).toEqual({
      questions: [{ id: 'Which one?', text: 'Which one?', options: ['Staging', 'Production'], multiple: false }],
    });
    expect(told.asked).toHaveLength(0);
    await session.close();
  });

  it('tells the agent nobody answered its question', async () => {
    const { session, turn } = open({ question: async () => undefined });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toMatch(/^deny: Nobody answered in time/);
    await session.close();
  });

  it('turns down control requests it has no use for, rather than leave them hanging', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'control:hook_callback'));

    expect((await turn()).text).toBe('The hook_callback request was answered with error.');
    await session.close();
  });

  it('takes a message that comes while it works into the same turn', async () => {
    const { session, turn } = open();
    session.send(message('m1', 'sleep:500'));
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(session.send(message('m2', 'and this'))).toBe(true);

    expect(await turn()).toEqual({
      inputIds: ['m1', 'm2'],
      outcome: 'completed',
      text: 'Done sleeping. Also: and this',
    });
    await session.close();
  });

  it('stops on interrupt, drops what waits behind the turn, and says so for each input', async () => {
    const { session, told } = open();
    session.send(message('m1', 'sleep:20000'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    session.send(message('m2', 'queued behind it'));

    await session.interrupt();

    expect(told.turns.flatMap((turn) => turn.inputIds).sort()).toEqual(['m1', 'm2']);
    expect(told.turns.every((turn) => turn.outcome === 'interrupted')).toBe(true);
    await session.close();
    expect(session.send(message('m3', 'too late'))).toBe(false);
  });

  it('withdraws a permission question when interrupted while it waits', async () => {
    let withdrawn = false;
    const { session } = open({
      permission: (_question, signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => {
            withdrawn = true;
            resolve({ optionId: 'deny', message: 'The run was stopped.' });
          });
        }),
    });
    session.send(message('m1', 'ask:deploy'));
    await new Promise((resolve) => setTimeout(resolve, 300));

    await session.interrupt();

    expect(withdrawn).toBe(true);
    await session.close();
  });

  it('goes on with a session, and says when that session is gone', async () => {
    const first = open();
    first.session.send(message('m1', 'hello'));
    await first.turn();
    await first.session.close();

    const again = open({ resume: first.session.id });
    again.session.send(message('m2', 'remember'));
    expect((await again.turn()).text).toBe('This session has seen 1 messages before.');
    await again.session.close();

    const gone = open({ resume: '11111111-2222-4333-8444-555555555555' });
    gone.session.send(message('m3', 'hello'));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(gone.told.lost[0]).toMatchObject({ sessionGone: true });
    await gone.session.close();
  });

  it('says what each tool it starts is: a line for the log, and the subject the core goes by', async () => {
    const { session, turn, told } = open();

    session.send(message('m1', 'sleep:10'));

    await turn();
    expect(told.progress).toEqual(['Bash: sleep']);
    expect(told.subjects).toEqual([{ kind: 'command', command: 'sleep' }]);
    await session.close();
  });

  it('names each tool it starts by its id, and says when that tool ended', async () => {
    const { session, turn, told } = open();

    session.send(message('m1', 'wait-for:10'));

    await turn();
    expect(told.started).toHaveLength(1);
    expect(told.ended).toEqual(told.started);
    await session.close();
  });

  it('reports a turn that ends in an error as failed', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'fail'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'failed', error: 'boom' });
    await session.close();
  });

  it('says why a turn failed when Claude Code gives the reason as its answer, as for a model call that failed', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'api-error'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'failed', error: 'Not logged in · Please run /login' });
    await session.close();
  });
});
