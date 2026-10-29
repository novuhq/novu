import { getEventListeners } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../api/client';
import { claudeCode } from './claude-code';
import { FakeApi } from './fake-api.fixture';
import { anyOf, type ListenLoopOptions, type ListenTiming, type LoopEnd, runListenLoop } from './loop';
import { type ListenConnection, type ListenState, memoryState, newState } from './state';
import { connectionChangedMessage, KEY_CHANGED_MESSAGE, STOPPED_REPLY } from './words';

const FAKE_CLAUDE = fileURLToPath(new URL('./fake-claude.fixture.mjs', import.meta.url));
const COMPUTER_ID = 'cmp_this_computer_0001';

/** Fast enough for a test, with the same shape as the real timing. */
const FAST: Partial<ListenTiming> = {
  waitSeconds: 1,
  pausedRetryMs: 150,
  retryMs: [50],
  resendAfterMs: 50,
  questionTimeoutMs: 1500,
  answerPollMs: 40,
};

async function eventually(check: () => void, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      check();

      return;
    } catch (err) {
      if (Date.now() > deadline) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The id of the question the host asked with this title, once it has. */
async function asked(api: FakeApi, title: string): Promise<string> {
  let id: string | undefined;
  await eventually(() => {
    id = api.interactions.find((interaction) => interaction.card.title === title)?.id;
    expect(id).toBeDefined();
  });

  return id as string;
}

interface Harness {
  api: FakeApi;
  dir: string;
  store: ReturnType<typeof memoryState>;
  logs: string[];
  loop: Promise<LoopEnd>;
  stop: () => Promise<LoopEnd>;
  /** Listens again with what it saved, as after a restart, once it was stopped. */
  restart: () => Promise<LoopEnd>;
  /** Each start of the fake `claude`: its arguments and folder. */
  starts: () => Array<{ argv: string[]; cwd: string }>;
}

let harness: Harness | undefined;

async function start(
  overrides: Partial<ListenState> = {},
  timing: Partial<ListenTiming> = {},
  /** Sets the API up before the loop's first call. */
  prepare: (api: FakeApi) => void = () => undefined,
  more: Pick<ListenLoopOptions, 'savedConnection'> = {}
): Promise<Harness> {
  const api = await new FakeApi().start();
  const dir = mkdtempSync(join(tmpdir(), 'listen-loop-'));
  vi.stubEnv('FAKE_CLAUDE_LOG', join(dir, 'claude.log'));
  vi.stubEnv('FAKE_CLAUDE_SESSIONS', join(dir, 'sessions'));
  vi.stubEnv('FAKE_API_URL', api.url);
  // The command took the lease before the loop began.
  api.lease = {
    computerId: COMPUTER_ID,
    computerName: 'MacBook',
    host: 'claude-code',
    since: new Date().toISOString(),
    renewedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 180_000).toISOString(),
  };
  prepare(api);

  const store = memoryState({
    ...newState({
      host: 'claude-code',
      project: dir,
      program: { command: process.execPath, args: [FAKE_CLAUDE] },
      limits: { runsPerHour: 20, maxRunSeconds: 60 },
    }),
    allowedAt: new Date().toISOString(),
    ...overrides,
  });
  const logs: string[] = [];
  let controller = new AbortController();
  const listen = () => {
    controller = new AbortController();

    return runListenLoop({
      client: createApiClient({ apiUrl: api.url, secretKey: 'sk_test', asHost: 'claude-code' }),
      agentIdentifier: 'human-relay',
      operatorId: 'ada',
      computerId: COMPUTER_ID,
      computerName: 'MacBook',
      host: claudeCode,
      store,
      timing: { ...FAST, ...timing },
      log: (line) => logs.push(line),
      signal: controller.signal,
      ...more,
    });
  };
  let loop = listen();
  const starts = () => {
    try {
      return readFileSync(join(dir, 'claude.log'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { argv: string[]; cwd: string });
    } catch {
      return [];
    }
  };
  harness = {
    api,
    dir,
    store,
    logs,
    loop,
    starts,
    stop: async () => {
      controller.abort();

      return loop;
    },
    restart: () => {
      loop = listen();

      return loop;
    },
  };

  // The loop is waiting once it has asked for messages.
  await eventually(() => expect(api.callsTo('GET', '/v1/listen/messages').length).toBeGreaterThan(0));

  return harness;
}

beforeEach(() => {
  harness = undefined;
});

afterEach(async () => {
  if (harness) {
    await harness.stop();
    await harness.api.stop();
    rmSync(harness.dir, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
});

describe('runListenLoop', { timeout: 20_000 }, () => {
  it('doesn’t start listening when it was stopped before it began, as by Ctrl-C while it asked', async () => {
    const api = await new FakeApi().start();
    const dir = mkdtempSync(join(tmpdir(), 'listen-loop-'));
    const stopped = new AbortController();
    stopped.abort();

    try {
      const end = await runListenLoop({
        client: createApiClient({ apiUrl: api.url, secretKey: 'sk_test', asHost: 'claude-code' }),
        agentIdentifier: 'human-relay',
        operatorId: 'ada',
        computerId: COMPUTER_ID,
        computerName: 'MacBook',
        host: claudeCode,
        store: memoryState({
          ...newState({
            host: 'claude-code',
            project: dir,
            program: { command: process.execPath, args: [FAKE_CLAUDE] },
            limits: { runsPerHour: 20, maxRunSeconds: 60 },
          }),
          allowedAt: new Date().toISOString(),
        }),
        timing: FAST,
        log: () => undefined,
        signal: stopped.signal,
      });

      expect(end).toEqual({ reason: 'signal' });
      expect(api.callsTo('GET', '/v1/listen/messages')).toHaveLength(0);
    } finally {
      await api.stop();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('starts Claude Code for a message and posts its last words when it didn’t reply itself', async () => {
    const { api, starts, store, dir } = await start();

    api.deliver({ text: 'hello there' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: hello there'));
    const [first] = starts();
    expect(first.cwd).toBe(dir);
    expect(first.argv).toEqual(
      expect.arrayContaining([
        '-p',
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json',
        '--verbose',
        '--permission-prompt-tool',
        'stdio',
      ])
    );
    expect(first.argv[first.argv.indexOf('--permission-mode') + 1]).toBe('acceptEdits');
    expect(first.argv).not.toContain('--allowedTools');
    expect(first.argv).not.toContain('--resume');
    const sessionId = first.argv[first.argv.indexOf('--session-id') + 1];
    expect(first.argv[first.argv.indexOf('--append-system-prompt') + 1]).toContain('conv_1');
    expect(store.current?.sessions.conv_1).toMatchObject({ sessionId, round: 0 });
    // Every call is the started host's check.
    expect(api.calls.every((call) => call.host === 'claude-code')).toBe(true);
  });

  it('goes on with the same session for the next message in the conversation', async () => {
    const { api, starts, store } = await start();

    api.deliver({ text: 'first' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: first'));
    const sessionId = store.current?.sessions.conv_1?.sessionId;

    api.deliver({ text: 'remember' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('This session has seen 1 messages before.'));
    const second = starts()[1];
    expect(second.argv[second.argv.indexOf('--resume') + 1]).toBe(sessionId);
    expect(second.argv).not.toContain('--session-id');
  });

  it('keeps one session per conversation', async () => {
    const { api, store } = await start();

    api.deliver({ text: 'in one', conversationId: 'conv_1' });
    api.deliver({ text: 'in two', conversationId: 'conv_2' });

    await eventually(() => {
      expect(api.sentInto('conv_1')).toContain('Echo: in one');
      expect(api.sentInto('conv_2')).toContain('Echo: in two');
    });
    expect(store.current?.sessions.conv_1?.sessionId).not.toBe(store.current?.sessions.conv_2?.sessionId);
  });

  it('lets a message that comes while it works join the same run', async () => {
    const { api, starts } = await start();

    api.deliver({ text: 'sleep:800' });
    await eventually(() => expect(starts()).toHaveLength(1));
    api.deliver({ text: 'and this too' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Done sleeping. Also: and this too'));
    expect(starts()).toHaveLength(1);
  });

  it('starts it without the marks of a session it was started from', async () => {
    vi.stubEnv('CLAUDECODE', '1');
    vi.stubEnv('AI_AGENT', 'claude-code_2-1-310_agent');
    vi.stubEnv('CODEX_THREAD_ID', 'thread_1');
    const { api } = await start();

    api.deliver({ text: 'env' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Parent marks: none.'));
  });

  it('stops the run on /stop and says so', async () => {
    const { api, starts, logs } = await start();

    api.deliver({ text: 'sleep:20000' });
    await eventually(() => expect(starts()).toHaveLength(1));
    const startedAt = Date.now();
    api.deliver({ text: '/stop' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Stopped.'));
    expect(Date.now() - startedAt).toBeLessThan(10_000);
    expect(api.sentInto('conv_1')).not.toContain('Done sleeping.');
    expect(logs.some((line) => line.includes('stopped (stop)'))).toBe(true);
  });

  it('drops what came with a /stop for the conversation, not only the run going on', async () => {
    const { api, starts, logs } = await start();

    api.deliver({ text: 'sleep:20000' });
    await eventually(() => expect(starts()).toHaveLength(1));
    // In one look: more work, then the stop.
    api.deliver({ text: 'and then deploy' });
    api.deliver({ text: '/stop' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain(STOPPED_REPLY));
    await eventually(() => expect(logs.some((line) => line.includes('stopped (stop)'))).toBe(true));
    await pause(600);
    expect(starts()).toHaveLength(1);
    expect(api.sentInto('conv_1')).not.toContain('Echo: and then deploy');
  });

  it('answers /stop with nothing to stop when nothing runs', async () => {
    const { api, starts } = await start();

    api.deliver({ text: '/STOP ' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Nothing was running.'));
    expect(starts()).toHaveLength(0);
  });

  it('lets the agent reply in its own conversation without asking anyone, and doesn’t reply twice', async () => {
    const { api } = await start();

    api.deliver({ text: 'reply-myself' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('I replied myself; all good.'));
    await pause(400);
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(0);
    expect(api.sentInto('conv_1')).not.toContain('Replied in the conversation.');
  });

  it('lets the agent reply and resolve in one command, joined with &&, without asking the operator', async () => {
    const { api } = await start();
    const command = 'npx @agentinbox/cli reply conv_1 "Done." && npx @agentinbox/cli resolve conv_1';

    api.deliver({ text: `ask:${command}` });

    await eventually(() => expect(api.sentInto('conv_1')).toContain(`Ran ${command}.`));
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(0);
  });

  it('names a long command in the card’s title, and keeps it whole in the body', async () => {
    const { api } = await start();
    const command = `echo ${'long '.repeat(200)}`.trim();

    api.deliver({ text: `ask:${command}` });

    await eventually(() =>
      expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1)
    );
    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.title).toBe('Claude Code wants to run a command');
    expect(question?.card.body).toContain(`Run \`${command}\`.\n\n`);
  });

  it('refuses a command too long to show the operator whole, without asking them', async () => {
    const { api } = await start();
    const command = `echo ${'x'.repeat(3000)} && rm -rf ~`;

    api.deliver({ text: `ask:${command}` });

    await eventually(() =>
      expect(api.sentInto('conv_1').some((text) => text.startsWith('Not allowed: It is too long to show'))).toBe(true)
    );
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(0);
  });

  it('shows typing in the conversation while the host works, from waking it until its answer goes out', async () => {
    const { api } = await start({}, { typingMs: 100 });

    api.deliver({ text: 'sleep:800' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Done sleeping.'));
    const shown = api.typing.filter((typing) => typing.conversationId === 'conv_1').length;
    expect(shown).toBeGreaterThanOrEqual(4);
    await pause(400);
    expect(api.typing).toHaveLength(shown);
  });

  it('stops typing once the agent starts its own reply, even while it works on after it', async () => {
    const { api } = await start({}, { typingMs: 100 });

    api.deliver({ text: 'reply-myself:800' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('I replied myself; all good.'));
    const shown = api.typing.length;
    expect(shown).toBeGreaterThan(0);
    await pause(500);
    expect(api.typing).toHaveLength(shown);
  });

  it('holds typing while the operator is asked, and goes on once they answer', async () => {
    const { api } = await start({}, { typingMs: 100 });

    api.deliver({ text: 'ask:npm publish' });

    await eventually(() =>
      expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1)
    );
    const asked = api.typing.length;
    await pause(400);
    expect(api.typing).toHaveLength(asked);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    api.answer(question?.id as string, 'approved');

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Ran npm publish.'));
    expect(api.typing.length).toBeGreaterThan(asked);
  });

  it('asks only once in a conversation whose chat has no typing, such as email', async () => {
    const { api } = await start({}, { typingMs: 100 });

    api.deliver({ text: 'sleep:500', conversationId: 'conv_mail', channel: 'email' });

    await eventually(() => expect(api.sentInto('conv_mail')).toContain('Done sleeping.'));
    expect(api.callsTo('POST', '/v1/listen/typing')).toHaveLength(1);
    expect(api.typing).toHaveLength(0);
  });

  it('asks the operator before a command its settings don’t allow, and passes the Allow back', async () => {
    const { api } = await start();
    api.decide = () => 'approved';

    api.deliver({ text: 'ask:npm publish', from: { id: 'ben', name: 'Ben', isOperator: false } });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Ran npm publish.'));
    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    // To the operator, even though a contact's message started it.
    expect(question?.to).toBe('ada');
    expect(question?.card.title).toBe('Claude Code wants to run `npm publish`');
    expect(question?.card.body).toContain('for Ben’s message');
    expect(question?.card.body).toContain('No answer in 2 seconds counts as Deny.');
    expect(question?.card).toMatchObject({
      approveLabel: 'Allow',
      denyLabel: 'Deny',
      extraActions: [{ id: 'allow_session', label: 'Allow for this session' }],
    });
    expect(question?.ttlSeconds).toBe(60);
  });

  it('asks the operator before the agent writes into another conversation', async () => {
    const { api } = await start();
    api.decide = () => 'denied';

    api.deliver({ text: 'ask:npx @agentinbox/cli reply conv_9 "hi"' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Not allowed: Your operator said no.'));
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1);
  });

  it('lets the agent reply with our MCP server’s tool in its own conversation without asking anyone', async () => {
    const { api } = await start();

    api.deliver({ text: 'mcp:mcp__plugin_agentinbox_AgentInbox__inbox_reply' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('I replied through MCP.'));
    await pause(400);
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(0);
    expect(api.sentInto('conv_1')).not.toContain('Used mcp__plugin_agentinbox_AgentInbox__inbox_reply.');
  });

  it('asks the operator before an MCP reply into another conversation, or through another server', async () => {
    const { api } = await start();
    api.decide = () => 'denied';
    const approves = () => api.interactions.filter((interaction) => interaction.kind === 'approve');

    api.deliver({ text: 'mcp:mcp__AgentInbox__inbox_reply conv_9' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Not allowed: Your operator said no.'));
    expect(approves()).toHaveLength(1);

    api.deliver({ text: 'mcp:mcp__mail__inbox_reply' });
    await eventually(() => expect(approves()).toHaveLength(2));
    // What it would be called with is on the card: the operator allows what they read.
    expect(approves()[1].card.title).toBe(
      'Claude Code wants to use inbox_reply from mail with conversation "conv_1", message "I replied through MCP."'
    );
  });

  it('keeps an "Allow for this session" for the rest of the session', async () => {
    const { api } = await start();
    api.decide = () => ({ status: 'approved', optionId: 'allow_session' });

    api.deliver({ text: 'ask-twice:npm test' });

    await eventually(() =>
      expect(api.sentInto('conv_1')).toContain('Ran npm test twice, and was allowed for the session.')
    );
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1);
  });

  it('passes a Deny back', async () => {
    const { api } = await start();
    api.decide = () => 'denied';

    api.deliver({ text: 'ask:rm -rf build' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Not allowed: Your operator said no.'));
  });

  it('passes the operator’s words on when they answer a permission question in words', async () => {
    const { api } = await start();
    api.decide = (interaction) =>
      interaction.kind === 'approve' ? { status: 'answered', text: 'not now, run the tests first' } : undefined;

    api.deliver({ text: 'ask:npm publish' });

    await eventually(() =>
      expect(api.sentInto('conv_1')).toContain(
        'Not allowed: Your operator answered in words instead of allowing it: “not now, run the tests first”. It isn’t allowed; follow what they wrote if it says what to do instead.'
      )
    );
  });

  it('counts no answer in time as Deny, and takes the question back', async () => {
    const { api } = await start({}, { questionTimeoutMs: 300 });

    api.deliver({ text: 'ask:curl example.com' });

    await eventually(() =>
      expect(api.sentInto('conv_1')).toContain('Not allowed: Nobody answered within 1 second, which counts as Deny.')
    );
    expect(api.interactions.find((interaction) => interaction.kind === 'approve')?.status).toBe('canceled');
  });

  it('takes the operator’s question back when the run stops while it waits', async () => {
    const { api } = await start();

    api.deliver({ text: 'ask:deploy' });
    await eventually(() => expect(api.interactions.some((interaction) => interaction.kind === 'approve')).toBe(true));
    api.deliver({ text: '/stop' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Stopped.'));
    expect(api.interactions.find((interaction) => interaction.kind === 'approve')?.status).toBe('canceled');
  });

  it('puts the agent’s own question to the person whose message started it, in the conversation', async () => {
    const { api } = await start();
    api.decide = (interaction) =>
      interaction.kind === 'choose' ? { status: 'answered', optionId: 'opt_2' } : undefined;

    api.deliver({ text: 'askuser', from: { id: 'ben', name: 'Ben', isOperator: false } });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Answers: {"Which one?":"Production"}'));
    const question = api.interactions.find((interaction) => interaction.kind === 'choose');
    expect(question).toMatchObject({ thread: 'conv_1' });
    expect(question?.card.options).toEqual([
      { id: 'opt_1', label: 'Staging' },
      { id: 'opt_2', label: 'Production' },
    ]);
    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(0);
  });

  it('settles its own question from the answer that comes with the messages', async () => {
    const { api } = await start({}, { answerPollMs: 60_000, questionTimeoutMs: 120_000 });
    api.decide = () => 'approved';

    api.deliver({ text: 'ask:npm run build' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Ran npm run build.'), 4000);
    // One lookup when it asked; the answer itself came with the messages.
    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(api.callsTo('GET', `/v1/inbox/messages/${question?.id}`)).toHaveLength(1);
  });

  it('never starts the host for the answer to its own question', async () => {
    const { api, starts } = await start();
    api.decide = () => 'approved';

    api.deliver({ text: 'ask:npm test' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Ran npm test.'));
    await pause(400);

    // The operator's tap came in as a message too, and started nothing.
    expect(api.listenMessages.some((message) => message.answersMessageId)).toBe(true);
    expect(starts()).toHaveLength(1);
  });

  it('starts a fresh session once the host resolved the conversation', async () => {
    const { api, store, starts } = await start();

    api.deliver({ text: 'resolve' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Resolved.'));
    const resolvedSession = store.current?.sessions.conv_1?.sessionId;

    // The next message comes in the next round.
    api.deliver({ text: 'remember' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('This session has seen 0 messages before.'));
    expect(starts()[1].argv).not.toContain('--resume');
    expect(store.current?.sessions.conv_1).toMatchObject({ round: 1 });
    expect(store.current?.sessions.conv_1?.sessionId).not.toBe(resolvedSession);
  });

  it('starts a fresh session after the operator resolved the conversation on agentinbox.md', async () => {
    const { api, starts } = await start();

    api.deliver({ text: 'hi' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: hi'));
    api.resolve('conv_1');
    api.deliver({ text: 'remember' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('This session has seen 0 messages before.'));
    expect(starts()[1].argv).not.toContain('--resume');
  });

  it('keeps a message of the next round out of the run of the round before', async () => {
    const { api, starts } = await start();

    api.deliver({ text: 'sleep:800' });
    await eventually(() => expect(starts()).toHaveLength(1));
    api.resolve('conv_1');
    api.deliver({ text: 'a new matter' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: a new matter'));
    expect(api.sentInto('conv_1')).toContain('Done sleeping.');
    expect(starts()).toHaveLength(2);
    expect(starts()[1].argv).not.toContain('--resume');
  });

  it('starts a fresh session when the host no longer has the old one', async () => {
    const { api, store, starts } = await start({
      sessions: {
        conv_1: { sessionId: '11111111-2222-4333-8444-555555555555', round: 0, lastRunAt: new Date().toISOString() },
      },
    });

    api.deliver({ text: 'still there?' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: still there?'));
    expect(starts()[0].argv).toContain('--resume');
    expect(starts()[1].argv).not.toContain('--resume');
    expect(store.current?.sessions.conv_1?.sessionId).not.toBe('11111111-2222-4333-8444-555555555555');
  });

  it('tells the operator when a run fails', async () => {
    const { api } = await start();

    api.deliver({ text: 'fail' });

    await eventually(() =>
      expect(api.sentInto('conv_operator')).toContain('Claude Code couldn’t answer in conv_1: boom')
    );
  });

  it('stops for good when another computer took the lease', async () => {
    const { api, store } = await start();

    api.takeOverElsewhere('codex');
    const end = await harness?.loop;

    expect(end).toMatchObject({ reason: 'listening_elsewhere' });
    expect(store.current?.stopped?.reason).toBe('listening_elsewhere');
    expect(store.current?.stopped?.message).toContain('Desktop (Codex, in ~/work)');
  });

  it('stops for good when another host took the lease on this same computer', async () => {
    const { api, store } = await start();

    api.takeOverElsewhere('codex', COMPUTER_ID);
    const end = await harness?.loop;

    expect(end).toMatchObject({ reason: 'listening_elsewhere' });
    expect(store.current?.stopped?.message).toBe(
      'It is listening on this computer for Codex, in ~/work now, so listening for Claude Code stopped.'
    );
  });

  it('stops for good, without retrying, when the key stops working', async () => {
    const { api, store } = await start();

    api.keyRejected = true;
    const end = await harness?.loop;
    const calls = api.calls.length;
    await pause(300);

    expect(end).toEqual({ reason: 'key_changed', message: KEY_CHANGED_MESSAGE });
    expect(store.current?.stopped?.message).toBe('The key changed on agentinbox.md. Connect again, then listen again.');
    expect(api.calls.length).toBe(calls);
  });

  it('waits while the agent is paused, and listens again once it is resumed', async () => {
    const { api, logs } = await start();

    api.paused = true;
    await eventually(() => expect(logs.some((line) => line.includes('paused'))).toBe(true));
    const leaseCalls = api.callsTo('POST', '/v1/listen/lease').length;
    await eventually(() => expect(api.callsTo('POST', '/v1/listen/lease').length).toBeGreaterThan(leaseCalls + 1));

    api.paused = false;
    api.deliver({ text: 'back again' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: back again'));
  });

  it('holds messages back past the hourly limit, and tells the operator once', async () => {
    const { api, store, starts } = await start({ limits: { runsPerHour: 1, maxRunSeconds: 60 } });

    api.deliver({ text: 'one', conversationId: 'conv_1' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: one'));
    api.deliver({ text: 'two', conversationId: 'conv_2' });
    api.deliver({ text: 'three', conversationId: 'conv_3' });

    await eventually(() =>
      expect(api.sentInto('conv_operator')).toContain(
        'Claude Code was started 1 time in the last hour, the most it may be. New messages wait, and start it as the hour allows.'
      )
    );
    await pause(400);
    expect(starts()).toHaveLength(1);
    expect(store.current?.queue.map((message) => message.text)).toEqual(['two', 'three']);
    expect(api.sentInto('conv_operator').filter((text) => text.includes('the last hour'))).toHaveLength(1);
  });

  it('stops a run that goes on too long', async () => {
    const { api } = await start({ limits: { runsPerHour: 20, maxRunSeconds: 1 } });

    api.deliver({ text: 'sleep:20000' });

    await eventually(() =>
      expect(api.sentInto('conv_1')).toContain(
        'Stopped after 1 second, the longest one run may take here. Send another message to go on.'
      )
    );
  });

  it('lets go of the lease when it is stopped on purpose', async () => {
    const { api, stop } = await start();

    const end = await stop();

    expect(end).toEqual({ reason: 'signal' });
    expect(api.callsTo('POST', '/v1/listen/lease/release').map((call) => call.body)).toEqual([
      { computerId: COMPUTER_ID, host: 'claude-code' },
    ]);
    expect(api.lease).toBeNull();
    // Each wait named the host it waits for.
    expect(api.callsTo('GET', '/v1/listen/messages').every((call) => call.query.host === 'claude-code')).toBe(true);
  });

  it('goes on from now when the API doesn’t know the cursor it had', async () => {
    const { api, logs } = await start({ cursor: 'from-another-deployment' });

    await eventually(() => expect(logs.some((line) => line.includes('going on from now'))).toBe(true));
    api.deliver({ text: 'still listening?' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: still listening?'));
  });

  it('starts nothing it had queued while it can’t renew the lease, and goes on once it can', async () => {
    const left = {
      id: 'msg_left',
      conversationId: 'conv_1',
      channel: 'telegram',
      from: { id: 'ada', name: 'Ada', isOperator: true },
      text: 'left from before',
      at: new Date().toISOString(),
      round: 0,
      isDirectMessage: true,
    };
    const { api, starts } = await start({ queue: [left] }, {}, (fake) => {
      fake.down = true;
    });

    await pause(600);
    expect(starts()).toHaveLength(0);

    api.down = false;
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: left from before'));
  });

  it('marks when a conversation’s session last ran, each time it runs', async () => {
    const { api, store } = await start();

    api.deliver({ text: 'first' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: first'));
    const first = store.current?.sessions.conv_1?.lastRunAt ?? '';
    await pause(20);
    api.deliver({ text: 'second' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: second'));

    expect((store.current?.sessions.conv_1?.lastRunAt ?? '') > first).toBe(true);
  });

  it('sees its own reply however much was written after it, and doesn’t reply twice', async () => {
    const { api, logs } = await start();

    api.deliver({ text: 'reply-myself:600' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('I replied myself; all good.'));
    api.chatter('conv_1', 30);

    await eventually(() => expect(logs.some((line) => line.includes('conv_1: done.'))).toBe(true));
    expect(api.sentInto('conv_1')).not.toContain('Replied in the conversation.');
  });

  it('gets its answer out once Agent Inbox can be reached again, without doing the work again', async () => {
    const { api, starts, logs } = await start();

    api.deliver({ text: 'sleep:600' });
    await eventually(() => expect(starts()).toHaveLength(1));
    api.down = true;
    await eventually(() => expect(logs.join('\n')).toMatch(/^conv_1: couldn’t reply .*; trying again/m));
    api.down = false;

    await eventually(() => expect(api.sentInto('conv_1')).toEqual(['Done sleeping.']));
    expect(starts()).toHaveLength(1);
  });

  it('gives up on an answer Agent Inbox can’t take for as long as it tries, and goes on with the next', async () => {
    const { api, logs, starts } = await start({}, { resendForMs: 300 });

    api.deliver({ text: 'sleep:600' });
    await eventually(() => expect(starts()).toHaveLength(1));
    api.down = true;
    await eventually(() => expect(logs.join('\n')).toMatch(/^conv_1: couldn’t reply .*; gave up after/m));
    api.down = false;

    api.deliver({ text: 'next one' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: next one'));
    expect(api.sentInto('conv_1')).not.toContain('Done sleeping.');
  });

  it('doesn’t post its answer twice when a try went through but its answer was lost on the way back', async () => {
    const { api, logs } = await start();

    api.loseNextAnswer = true;
    api.deliver({ text: 'hello there' });

    await eventually(() => expect(logs.some((line) => line.includes('conv_1: done.'))).toBe(true));
    expect(logs.join('\n')).toMatch(/^conv_1: couldn’t reply .*; trying again/m);
    expect(api.sentInto('conv_1')).toEqual(['Echo: hello there']);
  });

  it('tries a notice to the operator again too', async () => {
    const now = new Date().toISOString();
    const waiting = {
      id: 'msg_waiting',
      conversationId: 'conv_1',
      channel: 'telegram',
      from: { id: 'ada', name: 'Ada', isOperator: true },
      text: 'one more',
      at: now,
      round: 0,
      isDirectMessage: true,
    };
    const { api, logs } = await start({ limits: { runsPerHour: 1, maxRunSeconds: 60 }, runs: [now], queue: [waiting] });

    // The first wait is under way: the hourly limit's notice goes once it ends, while Agent Inbox can't be reached.
    api.down = true;
    await eventually(() => expect(logs.join('\n')).toMatch(/^Couldn’t tell the operator .*; trying again/m));
    api.down = false;

    await eventually(() =>
      expect(api.sentInto('conv_operator')).toContain(
        'Claude Code was started 1 time in the last hour, the most it may be. New messages wait, and start it as the hour allows.'
      )
    );
  });

  it('tells a conversation whose run a restart cut off, instead of running it again', async () => {
    const { api, starts, store } = await start({ running: { conversationId: 'conv_1', at: new Date().toISOString() } });

    await eventually(() =>
      expect(api.sentInto('conv_1').some((text) => text.startsWith('Claude Code stopped before it could finish'))).toBe(
        true
      )
    );
    expect(starts()).toHaveLength(0);
    expect(store.current?.running).toBeUndefined();
  });

  it('keeps the run it was stopped in, to tell its conversation when it starts again', async () => {
    const { api, starts, store, stop } = await start();

    api.deliver({ text: 'sleep:20000' });
    await eventually(() => expect(starts()).toHaveLength(1));
    await stop();

    expect(store.current?.running?.conversationId).toBe('conv_1');
  });

  it('passes the answer to the agent’s own question into the run when no command waits for it', async () => {
    const { api, starts } = await start();

    api.deliver({ text: 'sleep:1500' });
    await eventually(() => expect(starts()).toHaveLength(1));
    api.deliver({
      text: 'Production',
      answersMessageId: 'int_asked_with_async',
      answer: { status: 'answered', text: 'Production' },
    });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Done sleeping. Also: Production'));
  });

  it('leaves the answer to the agent’s command that still waits for it', async () => {
    const { api, starts, logs } = await start();

    api.deliver({ text: 'ask-and-wait:4000' });
    api.answer(await asked(api, 'Staging or prod?'), { status: 'answered', text: 'prod' });
    await eventually(() => expect(logs).toContain('conv_1: done.'));

    // The command got it: the session wasn't given it again, and no run started for it.
    api.deliver({ text: 'remember' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('This session has seen 1 messages before.'));
    expect(starts()).toHaveLength(2);
  });

  it('passes on the answer to a question asked with --async that comes while another command waits', async () => {
    const { api, starts, logs } = await start();

    api.deliver({ text: 'ask-async-and-wait:4000' });
    const region = await asked(api, 'Which region?');
    const stage = await asked(api, 'Staging or prod?');
    // The first answer comes while the command that asked the second question waits for its own.
    api.answer(region, { status: 'answered', text: 'eu-west' });
    await pause(300);
    api.answer(stage, { status: 'answered', text: 'prod' });
    await eventually(() => expect(logs).toContain('conv_1: done.'));

    // The first answer joined the run once the command ended; the second went to the command alone.
    expect(logs.filter((line) => line === 'conv_1: a new message joined the run.')).toHaveLength(1);
    api.deliver({ text: 'remember' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('This session has seen 2 messages before.'));
    expect(starts()).toHaveLength(2);
  });

  it('passes on an answer it looked up while the run ended, without looking again', async () => {
    const { api, logs } = await start();

    api.deliver({ text: 'ask-async-and-sleep:800' });
    const region = await asked(api, 'Which region?');
    // The look reads the answer at once, but what it found comes back only after the run ended.
    api.showDelayMs = 2000;
    api.answer(region, { status: 'answered', text: 'eu-west' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: eu-west'));
    expect(logs).not.toContain('conv_1: a new message joined the run.');
    expect(api.callsTo('GET', `/v1/inbox/messages/${region}`)).toHaveLength(1);
  });

  it('passes on an answer it looked up when it was stopped meanwhile, once it starts again', async () => {
    const { api, logs, store, stop, restart } = await start();
    api.deliver({ text: 'ask-async-and-sleep:0' });
    const region = await asked(api, 'Which region?');
    await eventually(() => expect(logs).toContain('conv_1: done.'));

    api.showDelayMs = 1000;
    api.answer(region, { status: 'answered', text: 'eu-west' });
    await eventually(() => expect(api.callsTo('GET', `/v1/inbox/messages/${region}`)).toHaveLength(1));
    await stop();

    expect(store.current?.queue.map((message) => message.answersMessageId)).toEqual([region]);
    expect(store.current?.lookedUp).toEqual(store.current?.queue.map((message) => message.id));
    api.showDelayMs = 0;
    void restart();

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: eu-west'));
    expect(api.callsTo('GET', `/v1/inbox/messages/${region}`)).toHaveLength(1);
    expect(store.current?.lookedUp).toEqual([]);
  });

  describe('once this computer is connected anew', () => {
    const CONNECTION: ListenConnection = {
      apiUrl: 'https://api.agentinbox.md',
      agentIdentifier: 'human-relay',
      key: '0123456789abcdef',
    };

    it('starts nothing more and stops for good: what it starts would answer with the new connection', async () => {
      let saved: ListenConnection | null = CONNECTION;
      const { api, starts, store, loop } = await start({ connection: CONNECTION }, {}, undefined, {
        savedConnection: () => saved,
      });

      saved = { ...CONNECTION, agentIdentifier: 'other-agent' };
      api.deliver({ text: 'hello' });

      const message = connectionChangedMessage('claude-code');
      expect(await loop).toEqual({ reason: 'connection_changed', message });
      expect(store.current?.stopped).toMatchObject({ reason: 'connection_changed', message });
      expect(starts()).toHaveLength(0);
    });

    it('stops the run going on too', async () => {
      let saved: ListenConnection | null = CONNECTION;
      const { api, starts, logs, loop } = await start({ connection: CONNECTION }, {}, undefined, {
        savedConnection: () => saved,
      });
      api.deliver({ text: 'sleep:5000' });
      await eventually(() => expect(starts()).toHaveLength(1));

      saved = { ...CONNECTION, key: 'fedcba9876543210' };

      expect(await loop).toMatchObject({ reason: 'connection_changed' });
      expect(logs).toContain('conv_1: stopped (shutdown).');
    });

    it('doesn’t start the host for a run that was getting ready meanwhile', async () => {
      let saved: ListenConnection | null = CONNECTION;
      // The wait for messages lasts longer than the lookup: nothing else notices the new connection first.
      const { api, starts, logs, loop } = await start({ connection: CONNECTION }, { waitSeconds: 5 }, undefined, {
        savedConnection: () => saved,
      });
      api.deliver({ text: 'ask-async-and-sleep:0' });
      const region = await asked(api, 'Which region?');
      await eventually(() => expect(logs).toContain('conv_1: done.'));

      api.showDelayMs = 1000;
      api.answer(region, { status: 'answered', text: 'eu-west' });
      await eventually(() => expect(api.callsTo('GET', `/v1/inbox/messages/${region}`)).toHaveLength(1));
      saved = { ...CONNECTION, key: 'fedcba9876543210' };

      expect(await loop).toMatchObject({ reason: 'connection_changed' });
      expect(starts()).toHaveLength(1);
    });

    it('goes on while the saved connection can’t be read, as while it is being written', async () => {
      const { api } = await start({ connection: CONNECTION }, {}, undefined, { savedConnection: () => null });

      api.deliver({ text: 'hello' });

      await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: hello'));
    });
  });

  describe('a question the agent puts to someone outside its conversation too', () => {
    const BOB = { id: 'bob', name: 'Bob', isOperator: false };
    const CAROL = { id: 'carol', name: 'Carol', isOperator: false };

    /** Bob's message starts the host, which asks Bob and Carol "Ship it?" once the operator allows it. */
    async function askBobAndCarol(api: FakeApi, words: string): Promise<string> {
      api.decide = (interaction) => (interaction.card.title === 'Ship it?' ? undefined : 'approved');
      api.deliver({ text: words, conversationId: 'conv_bob', from: BOB });
      let id: string | undefined;
      await eventually(() => {
        id = api.interactions.find((interaction) => interaction.card.title === 'Ship it?')?.id;
        expect(id).toBeDefined();
      });

      return id as string;
    }

    it('goes on with the session that asked when the answer comes back, and starts nothing for whoever gave it', async () => {
      const { api, starts, logs } = await start();
      const ship = await askBobAndCarol(api, 'ask-others:bob,carol');
      await eventually(() => expect(logs).toContain('conv_bob: done.'));

      // Carol presses in her own chat; the answer comes back to Bob's conversation, where it was asked.
      api.answer(ship, 'approved', false, CAROL);

      await eventually(() => expect(api.sentInto('conv_bob')).toContain('Echo: Approved'));
      const [first, second] = starts();
      expect(second.argv).toContain('--resume');
      expect(second.argv).toContain(first.argv[first.argv.indexOf('--session-id') + 1]);
      expect(starts()).toHaveLength(2);
      expect(logs.filter((line) => line.startsWith('Started'))).toEqual([
        'Started Claude Code for conv_bob (Bob).',
        expect.stringMatching(/^Started Claude Code for conv_bob \(Carol\), going on with session /),
      ]);
    });

    it('starts nothing for an answer to a question no session here asked, as another host’s', async () => {
      const { api, starts, logs } = await start();

      api.deliver({
        text: 'Approved',
        conversationId: 'conv_carol',
        from: CAROL,
        answersMessageId: 'int_asked_by_another_host',
        answer: { status: 'approved', optionId: 'approve' },
      });

      await eventually(() =>
        expect(logs).toContain(
          'conv_carol: the answer to int_asked_by_another_host starts nothing: no session here asked it.'
        )
      );
      expect(starts()).toHaveLength(0);
    });

    it('leaves the answer to the command that asked and waits for it', async () => {
      const { api, starts, logs } = await start();
      const ship = await askBobAndCarol(api, 'ask-others:bob,carol:wait');

      api.answer(ship, 'approved', false, CAROL);

      await eventually(() => expect(logs).toContain('conv_bob: done.'));
      await pause(400);
      // The command read the answer, and nothing else got it: no new message in the run, no run after it.
      expect(api.interactions.find((interaction) => interaction.id === ship)?.answerReadAt).toBeDefined();
      expect(starts()).toHaveLength(1);
      // The card is the agent's own reply in the conversation, so its last words don't follow it.
      expect(api.sentInto('conv_bob')).toEqual(['Ship it?']);
    });
  });

  it('keeps nothing of a finished wait for the operator on what lasts as long as the listener', () => {
    const lasting = new AbortController();

    // As many looks as a ten-minute wait takes, each one on the signal of the whole wait.
    for (let wait = 0; wait < 120; wait++) {
      anyOf(lasting.signal, new AbortController().signal).dispose();
    }

    expect(getEventListeners(lasting.signal, 'abort')).toHaveLength(0);
  });

  it('wakes a wait as soon as any of its signals ends it', () => {
    const question = new AbortController();
    const woken = anyOf(new AbortController().signal, question.signal);

    question.abort();

    expect(woken.signal.aborted).toBe(true);
    woken.dispose();
  });

  it('handles each message once, even when it comes back', async () => {
    const { api, starts } = await start();

    const message = api.deliver({ text: 'only once' });
    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: only once'));
    api.listenMessages.push(message);
    api.deliver({ text: 'next' });

    await eventually(() => expect(api.sentInto('conv_1')).toContain('Echo: next'));
    expect(starts()).toHaveLength(2);
    expect(api.sentInto('conv_1').filter((text) => text === 'Echo: only once')).toHaveLength(1);
  });
});
