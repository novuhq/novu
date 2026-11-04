import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CODEX_MISSING_HELP,
  CODEX_SIGNED_OUT_HELP,
  codex,
  providerOf,
  SANDBOX_NOTE,
  threadParams,
  unwrapShell,
} from './codex';
import type {
  HostAnswer,
  HostQuestion,
  HostSession,
  PermissionAnswer,
  PermissionQuestion,
  TurnEnded,
} from './host-adapter';

const FAKE_CODEX = fileURLToPath(new URL('./fake-codex.fixture.mjs', import.meta.url));

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'listen-codex-'));
  vi.stubEnv('FAKE_CODEX_SESSIONS', join(dir, 'sessions'));
  vi.stubEnv('FAKE_CODEX_LOG', join(dir, 'codex.log'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** A `codex` on a PATH of its own: the fake, behind a small launcher. */
function installFake(): string {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const file = join(bin, 'codex');
  writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_CODEX}" "$@"\n`);
  chmodSync(file, 0o755);

  return bin;
}

/** Each thread the fake opened or went on with, and how. */
function threads(): Array<{ method: string; params: Record<string, unknown> }> {
  try {
    return readFileSync(join(dir, 'codex.log'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.event === 'thread')
      .map(({ method, params }) => ({ method, params }));
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

/** A session of the fake `codex app-server`, with what it told the core. */
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
  const session = codex.open(
    {
      program: { command: process.execPath, args: [FAKE_CODEX] },
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

const THREE_OPTIONS = [
  { id: 'allow', label: 'Allow', kind: 'allow_once' },
  { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' },
  { id: 'deny', label: 'Deny', kind: 'deny' },
];

describe('threadParams', () => {
  it('works in the project, in the sandbox, and asks the operator before anything the sandbox doesn’t allow', () => {
    expect(threadParams({ project: '/work/app', instructions: 'Agent Inbox started you.' })).toEqual({
      cwd: '/work/app',
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
      sandbox: 'workspace-write',
      developerInstructions: `Agent Inbox started you.\n\n${SANDBOX_NOTE}`,
    });
    expect(SANDBOX_NOTE).toContain('run them with escalated permissions from the start');
  });

  it('keeps the operator’s own developer instructions, before the listener’s', () => {
    expect(
      threadParams({ project: '/work/app', instructions: 'Agent Inbox started you.', own: 'Answer in French.' })
        .developerInstructions
    ).toBe(`Answer in French.\n\nAgent Inbox started you.\n\n${SANDBOX_NOTE}`);
  });
});

describe('unwrapShell', () => {
  it('reads the script out of the shell Codex runs it in', () => {
    expect(unwrapShell(`/bin/zsh -lc 'npm test'`)).toBe('npm test');
    expect(unwrapShell(`bash -lc 'npx @agentinbox/cli reply conv_1 "it'\\''s done"'`)).toBe(
      `npx @agentinbox/cli reply conv_1 "it's done"`
    );
    expect(unwrapShell('/bin/sh -c ls')).toBe('ls');
  });

  it('leaves anything else as Codex gave it', () => {
    expect(unwrapShell('git status')).toBe('git status');
    expect(unwrapShell(`/bin/zsh -lc 'ls' extra`)).toBe(`/bin/zsh -lc 'ls' extra`);
    expect(unwrapShell(`python -c 'print(1)'`)).toBe(`python -c 'print(1)'`);
  });
});

describe('providerOf', () => {
  it('is OpenAI’s own, signed in with `codex login`, unless the config names another', () => {
    expect(providerOf({})).toEqual({ signsInToOpenAI: true });
    expect(providerOf({ model_provider: 'openai' })).toEqual({ signsInToOpenAI: true });
  });

  it('names another provider, and the key from the shell it signs in with', () => {
    const config = {
      model_provider: 'azure',
      model_providers: { azure: { name: 'Azure', env_key: 'AZURE_OPENAI_API_KEY' } },
    };

    expect(providerOf(config)).toEqual({ name: 'Azure', envKey: 'AZURE_OPENAI_API_KEY', signsInToOpenAI: false });
  });

  it('goes by the profile the config picks', () => {
    expect(
      providerOf({
        model_provider: 'openai',
        profile: 'local',
        profiles: { local: { model_provider: 'oss' } },
      })
    ).toEqual({ name: 'Ollama', signsInToOpenAI: false });
  });
});

describe('Codex’s settings from the shell', () => {
  it('keeps where Codex keeps its config and how it reaches OpenAI, never a secret', () => {
    expect(
      codex.settingsIn({
        CODEX_HOME: '/Users/ada/.codex-work',
        OPENAI_BASE_URL: 'https://proxy.example.com/v1',
        OPENAI_API_KEY: 'sk-secret',
        CODEX_API_KEY: 'sk-secret',
        PATH: '/bin',
      })
    ).toEqual({ CODEX_HOME: '/Users/ada/.codex-work', OPENAI_BASE_URL: 'https://proxy.example.com/v1' });
  });
});

describe('codex.check', () => {
  it('finds codex on the PATH, its version, and that it is signed in', async () => {
    const bin = installFake();

    expect(await codex.check(dir, { PATH: bin, HOME: dir })).toEqual({
      ok: true,
      program: { command: join(bin, 'codex'), args: [] },
      version: '0.165.0',
      warnings: [],
      secrets: [],
    });
  });

  it('finds the sign-in when the environment doesn’t name the account, as a service launchd starts', async () => {
    const bin = installFake();

    expect(await codex.check(dir, { PATH: bin })).toMatchObject({ ok: true });
  });

  it('says how to install Codex when it isn’t there', async () => {
    vi.stubEnv('HOME', dir);

    expect(await codex.check(dir, { PATH: join(dir, 'nowhere') })).toEqual({ ok: false, message: CODEX_MISSING_HELP });
    expect(CODEX_MISSING_HELP).toContain('curl -fsSL https://chatgpt.com/codex/install.sh | sh');
  });

  it('says so when codex is there but doesn’t start', async () => {
    const file = join(dir, 'codex');
    writeFileSync(file, '#!/bin/sh\necho "broken install" >&2\nexit 3\n');
    chmodSync(file, 0o755);

    const checked = await codex.check(dir, { PATH: dir });

    expect(checked.ok === false && checked.message).toContain('didn’t start: broken install');
  });

  it('asks to update a Codex without the app server the listener drives', async () => {
    const bin = installFake();

    const checked = await codex.check(dir, { PATH: bin, HOME: dir, FAKE_CODEX_OLD: '1' });

    expect(checked.ok === false && checked.message).toContain('Update Codex');
  });

  it('asks to sign in to Codex first', async () => {
    const bin = installFake();

    expect(await codex.check(dir, { PATH: bin, HOME: dir, FAKE_CODEX_SIGNED_OUT: '1' })).toEqual({
      ok: false,
      message: CODEX_SIGNED_OUT_HELP,
    });
  });

  it('names another provider and the key from the shell it signs in with, without asking for `codex login`', async () => {
    const bin = installFake();
    const shell = {
      PATH: bin,
      HOME: dir,
      FAKE_CODEX_SIGNED_OUT: '1',
      FAKE_CODEX_PROVIDER: 'azure',
      FAKE_CODEX_PROVIDERS: JSON.stringify({ azure: { name: 'Azure', env_key: 'AZURE_OPENAI_API_KEY' } }),
    };

    expect(await codex.check(dir, { ...shell, AZURE_OPENAI_API_KEY: 'secret' })).toMatchObject({
      ok: true,
      secrets: ['AZURE_OPENAI_API_KEY'],
      provider: 'Azure',
    });
    expect(await codex.check(dir, shell)).toMatchObject({ ok: true, secrets: [], provider: 'Azure' });
  });
});

describe('a Codex session', { timeout: 15_000 }, () => {
  it('opens a thread in the project, and reports each turn with the messages it took', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'hello'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'completed', text: 'Echo: hello' });
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(threads()).toEqual([
      {
        method: 'thread/start',
        params: {
          cwd: dir,
          approvalPolicy: 'on-request',
          approvalsReviewer: 'user',
          sandbox: 'workspace-write',
          developerInstructions: `Agent Inbox started you.\n\n${SANDBOX_NOTE}`,
        },
      },
    ]);
    await session.close();
    expect(told.lost).toEqual([]);
  });

  it('keeps the operator’s own developer instructions from their config', async () => {
    vi.stubEnv('FAKE_CODEX_DEVELOPER_INSTRUCTIONS', 'Answer in French.');
    const { session, turn } = open();

    session.send(message('m1', 'hello'));
    await turn();

    expect(threads()[0].params.developerInstructions).toBe(
      `Answer in French.\n\nAgent Inbox started you.\n\n${SANDBOX_NOTE}`
    );
    await session.close();
  });

  it('asks before a command its sandbox doesn’t allow, showing the command and not the shell it runs in', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Ran npm publish (accept).');
    expect(told.asked[0]).toEqual({
      subject: { kind: 'command', command: 'npm publish', cwd: dir },
      action: 'run `npm publish`',
      brief: 'run a command',
      details: ['It needs the network, which the sandbox doesn’t give.'],
      options: THREE_OPTIONS,
    });
    await session.close();
  });

  it('allows for the session when the operator does', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow_session' }) });

    session.send(message('m1', 'ask-twice:npm test'));

    expect((await turn()).text).toBe('Ran npm test twice, and was allowed for the session.');
    expect(told.asked).toHaveLength(1);
    await session.close();
  });

  it('declines, and tells the agent what the operator said in the turn', async () => {
    const { session, turn } = open({
      permission: async () => ({ optionId: 'deny', message: 'Your operator said no.' }),
    });

    session.send(message('m1', 'ask:npm publish'));

    expect((await turn()).text).toBe('Not allowed (decline). Told: Your operator said no.');
    await session.close();
  });

  it('asks before it reaches the network', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'network:registry.npmjs.org'));

    expect((await turn()).text).toBe('Network: accept.');
    expect(told.asked[0]).toMatchObject({
      subject: { kind: 'network', hosts: ['registry.npmjs.org'] },
      action: 'reach registry.npmjs.org',
      brief: 'reach the network',
    });
    await session.close();
  });

  it('asks before it edits a file outside what its sandbox may write', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow_session' }) });

    session.send(message('m1', 'edit:/etc/hosts'));

    expect((await turn()).text).toBe('Edit: acceptForSession.');
    expect(told.asked[0]).toEqual({
      subject: { kind: 'files', paths: ['/etc/hosts'] },
      action: 'edit /etc/hosts',
      brief: 'edit a file',
      details: ['It is outside the project.'],
      options: THREE_OPTIONS,
    });
    await session.close();
  });

  it('asks before it gets more than its sandbox gives, for the turn or the session', async () => {
    const once = open();
    once.session.send(message('m1', 'permissions'));
    expect((await once.turn()).text).toBe('Permissions: network for the turn.');
    expect(once.told.asked[0]).toMatchObject({ subject: { kind: 'network', hosts: [] }, action: 'use the network' });
    await once.session.close();

    const denied = open({ permission: async () => ({ optionId: 'deny' }) });
    denied.session.send(message('m1', 'permissions'));
    expect((await denied.turn()).text).toBe('Permissions: nothing for the turn.');
    await denied.session.close();
  });

  it('asks before an MCP tool, with what it is called with, and keeps an allow for the session', async () => {
    const { session, told, turn } = open({ permission: async () => ({ optionId: 'allow_session' }) });

    session.send(message('m1', 'mcp:create_issue'));

    expect((await turn()).text).toBe('Used create_issue (session).');
    expect(told.asked[0]).toEqual({
      subject: {
        kind: 'mcp',
        server: 'AgentInbox',
        tool: 'create_issue',
        input: { conversation: 'conv_1', message: 'I replied through MCP.' },
      },
      action: 'use create_issue from AgentInbox with conversation "conv_1", message "I replied through MCP."',
      brief: 'use create_issue from AgentInbox',
      details: ['Allow the AgentInbox MCP server to run tool "create_issue"?'],
      options: THREE_OPTIONS,
    });
    await session.close();
  });

  it('declines what an MCP server asks that isn’t an approval, without asking anyone', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'form'));

    expect((await turn()).text).toBe('Form: decline.');
    expect(told.asked).toEqual([]);
    expect(told.questions).toEqual([]);
    await session.close();
  });

  it('puts its questions to the core, and passes the answers back', async () => {
    const { session, told, turn } = open({ question: async () => ({ answers: { env: ['Production'] } }) });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toBe('Answers: {"env":{"answers":["Production"]}}');
    expect(told.questions[0]).toEqual({
      questions: [{ id: 'env', text: 'Which one?', options: ['Staging', 'Production'], multiple: false }],
    });
    expect(told.asked).toHaveLength(0);
    await session.close();
  });

  it('tells the agent nobody answered its question', async () => {
    const { session, turn } = open({ question: async () => undefined });

    session.send(message('m1', 'askuser'));

    expect((await turn()).text).toContain('Nobody answered in time.');
    await session.close();
  });

  it('takes a message that comes while it works into the same turn', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'sleep:600'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    session.send(message('m2', 'and this too'));

    expect(await turn()).toEqual({
      inputIds: ['m1', 'm2'],
      outcome: 'completed',
      text: 'Done sleeping. Also: and this too',
    });
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
    const ended = turn();
    await session.interrupt();

    expect(await ended).toEqual({ inputIds: ['m1'], outcome: 'interrupted' });
    expect(withdrawn?.aborted).toBe(true);
    await session.close();
  });

  it('stops a session that is still opening without waiting for it, and says so for each message', async () => {
    vi.stubEnv('FAKE_CODEX_SLOW_START', '60000');
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

  it('goes on with a thread, and says when that thread is gone', async () => {
    const first = open();
    first.session.send(message('m1', 'hello'));
    await first.turn();
    const kept = first.session.id;
    await first.session.close();

    const again = open({ resume: kept });
    again.session.send(message('m2', 'remember'));
    expect((await again.turn()).text).toBe('This thread has seen 1 messages before.');
    expect(again.session.id).toBe(kept);
    expect(threads()[1]).toMatchObject({ method: 'thread/resume', params: { threadId: kept, excludeTurns: true } });
    await again.session.close();

    const gone = open({ resume: '019a0000-0000-7000-8000-000000000000' });
    const lost = gone.lost();
    gone.session.send(message('m3', 'hello'));
    await lost;
    expect(gone.told.lost).toEqual([
      { error: 'no rollout found for thread id 019a0000-0000-7000-8000-000000000000', sessionGone: true },
    ]);
    await gone.session.close();
  });

  it('says what each tool is, by its id, and when it ended: the command, not the shell it runs in', async () => {
    const { session, told, turn } = open();

    session.send(message('m1', 'wait-for:100'));
    await turn();

    expect(told.progress).toEqual(['Shell: npx @agentinbox/cli reply conv_1 ask "Staging or prod?"']);
    expect(told.subjects).toEqual([
      { kind: 'command', command: 'npx @agentinbox/cli reply conv_1 ask "Staging or prod?"' },
    ]);
    expect(told.ended).toEqual(told.started);
    await session.close();
  });

  it('answers with the turn’s final words, not what it said along the way', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'commentary'));

    expect((await turn()).text).toBe('Here is the answer.');
    await session.close();
  });

  it('reports a turn that fails, with Codex’s reason', async () => {
    const { session, turn } = open();

    session.send(message('m1', 'fail'));

    expect(await turn()).toEqual({ inputIds: ['m1'], outcome: 'failed', error: 'You have hit your usage limit.' });
    await session.close();
  });

  it('leaves out the marks of a session listen was started from', async () => {
    vi.stubEnv('CLAUDECODE', '1');
    vi.stubEnv('CODEX_THREAD_ID', 'parent');
    vi.stubEnv('CODEX_SANDBOX_NETWORK_DISABLED', '1');
    const { session, turn } = open();

    session.send(message('m1', 'env'));

    expect((await turn()).text).toBe('Parent marks: none.');
    await session.close();
  });
});
