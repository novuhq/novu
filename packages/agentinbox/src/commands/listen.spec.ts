import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../api/client';
import { waitForListenMessages } from '../api/listen';
import type { CliConfig } from '../config';
import type { AskedAllow, AskedStore } from '../listen/allow';
import { CLAUDE_CODE_MISSING_HELP } from '../listen/claude-code';
import { FakeApi } from '../listen/fake-api.fixture';
import { fileForeground, stopForeground } from '../listen/foreground';
import { loadHost } from '../listen/hosts';
import type { BackgroundCommand, ServiceManager } from '../listen/service';
import { memoryState, newState } from '../listen/state';
import { KEY_CHANGED_MESSAGE, NEEDS_ACCOUNT_MESSAGE, PAUSED_MESSAGE } from '../listen/words';
import { EXIT_DENIED, EXIT_OK, EXIT_TIMEOUT } from '../output';
import { type ListenDeps, listenOn, listenRun, listenStatus, listenStop } from './listen';

const FAKE_CLAUDE = fileURLToPath(new URL('../listen/fake-claude.fixture.mjs', import.meta.url));

let dir: string;
let api: FakeApi;
/** Processes a test started, ended after it. */
const children: ChildProcess[] = [];

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'listen-command-'));
  api = await new FakeApi().start();
  const config: CliConfig = {
    apiUrl: api.url,
    auth: { mode: 'apiKey', secretKey: 'sk_test' },
    relayAgentIdentifier: 'human-relay',
    subscriberId: 'ada',
  };
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config));
  vi.stubEnv('INBOX_CONFIG', join(dir, 'config.json'));
  vi.stubEnv('INBOX_API_URL', '');
  vi.stubEnv('INBOX_SECRET_KEY', '');
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
});

afterEach(async () => {
  for (const child of children.splice(0)) {
    child.kill('SIGKILL');
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await api.stop();
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A `claude` on a PATH of its own: the fake, behind a small launcher. `keyOnly`: signed in only with
 * ANTHROPIC_API_KEY, whatever environment it is started with.
 */
function fakeClaudeOnPath({ keyOnly = false } = {}): string {
  const bin = join(dir, keyOnly ? 'key-only-bin' : 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, 'claude'),
    `#!/bin/sh\n${keyOnly ? 'export FAKE_CLAUDE_KEY_ONLY=1\n' : ''}exec "${process.execPath}" "${FAKE_CLAUDE}" "$@"\n`
  );
  chmodSync(join(bin, 'claude'), 0o755);

  return bin;
}

function fakeService() {
  const installed: BackgroundCommand[] = [];
  /** `failing`: the service manager turns it down after its file is written, as launchctl's bootstrap can. */
  const status = { present: false, failing: false };
  const service: ServiceManager = {
    kind: 'launchd',
    file: join(dir, 'md.agentinbox.listen.plist'),
    render: () => '',
    install: (command) => {
      status.present = true;
      if (status.failing) {
        throw new Error('Couldn’t start the background service: launchctl bootstrap: 5: Input/output error');
      }
      installed.push(command);
    },
    uninstall: () => {
      const had = status.present;
      status.present = false;

      return had;
    },
    isInstalled: () => status.present,
    isRunning: () => status.present,
  };

  return { service, installed, status };
}

function memoryAsked(): AskedStore & { current: AskedAllow | null } {
  const store = {
    current: null as AskedAllow | null,
    load: () => store.current,
    save: (asked: AskedAllow | null) => {
      store.current = asked;
    },
  };

  return store;
}

function deps(overrides: Partial<ListenDeps> & { answer?: string; personAtTerminal?: boolean } = {}) {
  const lines: string[] = [];
  const project = join(dir, 'project');
  mkdirSync(project, { recursive: true });
  const { service, installed, status } = fakeService();
  const store = memoryState();
  const asked = memoryAsked();
  const prompt = vi.fn().mockResolvedValue(overrides.answer ?? 'y');
  const result: ListenDeps = {
    store,
    asked,
    foreground: fileForeground,
    service: () => service,
    loadHost,
    computerName: () => 'MacBook',
    io: { personAtTerminal: overrides.personAtTerminal ?? true, prompt, say: (line) => lines.push(line) },
    script: '/opt/agentinbox/dist/src/index.js',
    nodePath: process.execPath,
    env: { PATH: fakeClaudeOnPath(), HOME: dir },
    cwd: project,
    out: (line) => lines.push(line),
    ...overrides,
  };

  return { deps: result, lines, store, asked, service, installed, status, prompt, project };
}

/** A process that looks like a listener in a terminal (`listen claude-code --foreground`), with its number kept. */
function foregroundListener(): ChildProcess {
  const terminal = spawn(process.execPath, [
    '-e',
    'setInterval(() => {}, 1000)',
    'listen',
    'claude-code',
    '--foreground',
  ]);
  children.push(terminal);
  fileForeground.claim(terminal.pid ?? 0);

  return terminal;
}

function config(): CliConfig {
  return JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')) as CliConfig;
}

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

describe('listen <host>', { timeout: 20_000 }, () => {
  it('asks a person at the terminal, then listens in the background', async () => {
    const { deps: listener, prompt, installed, store, project } = deps();

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(prompt).toHaveBeenCalledWith(`Listen for messages on MacBook, and start Claude Code in ${project}? [y/N] `);
    const computerId = config().computerId;
    expect(computerId).toMatch(/^cmp_[A-Za-z0-9_-]{16,}$/);
    expect(api.callsTo('POST', '/v1/listen/lease')[0].body).toEqual({
      computerId,
      computerName: 'MacBook',
      host: 'claude-code',
      project,
    });
    expect(api.lease).toMatchObject({ computerId, host: 'claude-code' });
    expect(installed[0].argv).toEqual([process.execPath, '/opt/agentinbox/dist/src/index.js', 'listen', 'run']);
    expect(installed[0].workingDirectory).toBe(project);
    expect(store.current).toMatchObject({
      host: 'claude-code',
      project,
      limits: { runsPerHour: 20, maxRunSeconds: 1800 },
    });
    expect(store.current?.allowedAt).toBeTruthy();
    // Every call is Claude Code's.
    expect(api.calls.every((call) => call.host === 'claude-code')).toBe(true);
  });

  it('takes nothing when the person says no', async () => {
    const { deps: listener, installed } = deps({ answer: 'n' });

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_DENIED);

    expect(api.callsTo('POST', '/v1/listen/lease')).toHaveLength(0);
    expect(installed).toHaveLength(0);
  });

  it('asks the operator with an approve when an agent ran it, and takes nothing until they allow it', async () => {
    const { deps: listener, installed, project } = deps({ personAtTerminal: false });
    api.decide = () => 'approved';

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question).toMatchObject({ to: 'ada', from: 'Claude Code', ttlSeconds: 3600 });
    expect(question?.card).toMatchObject({
      title: `Listen for messages on MacBook, and start Claude Code in ${project}?`,
      approveLabel: 'Allow',
      denyLabel: 'Deny',
    });
    expect(api.lease?.host).toBe('claude-code');
    expect(installed).toHaveLength(1);
  });

  it('stops when the operator denies it', async () => {
    const { deps: listener, installed, lines } = deps({ personAtTerminal: false });
    api.decide = () => 'denied';

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_DENIED);

    expect(lines).toContain('Not listening: your operator said no.');
    expect(api.lease).toBeNull();
    expect(installed).toHaveLength(0);
  });

  it('goes on waiting on the same question when it is run again', async () => {
    const { deps: listener, asked, installed } = deps({ personAtTerminal: false });

    expect(await listenOn('claude-code', { timeout: '1s' }, listener)).toBe(EXIT_TIMEOUT);
    expect(asked.current?.interactionId).toBeTruthy();
    expect(installed).toHaveLength(0);

    const questionId = asked.current?.interactionId ?? '';
    setTimeout(() => api.answer(questionId, 'approved'), 300);
    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1);
    expect(asked.current).toBeNull();
    expect(installed).toHaveLength(1);
  });

  it('asks anew when it is run again after another computer started listening', async () => {
    const { deps: listener, asked } = deps({ personAtTerminal: false });

    expect(await listenOn('claude-code', { timeout: '1s' }, listener)).toBe(EXIT_TIMEOUT);
    const first = asked.current?.interactionId;
    api.takeOverElsewhere('codex');
    api.decide = () => 'approved';
    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    // The first card didn't say it moves listening from that computer: the operator allows what they read.
    const approves = api.interactions.filter((interaction) => interaction.kind === 'approve');
    expect(approves).toHaveLength(2);
    expect(approves[1].id).not.toBe(first);
    expect(approves[1].card.body).toContain('this moves it here');
    expect(api.callsTo('POST', '/v1/listen/lease').at(-1)?.body).toMatchObject({ takeOver: true });
  });

  it('asks before moving it from another computer, and takes it over once allowed', async () => {
    api.takeOverElsewhere('codex');
    const { deps: listener } = deps({ personAtTerminal: false });
    api.decide = () => 'approved';

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.body).toContain('It is listening on Desktop now (Codex, in ~/work); this moves it here.');
    expect(api.callsTo('POST', '/v1/listen/lease')[0].body).toMatchObject({ takeOver: true });
    expect(api.lease?.computerId).toBe(config().computerId);
  });

  it('knows where waiting starts before it says it is listening, so a message sent meanwhile isn’t missed', async () => {
    api.deliver({ text: 'before it was turned on' });
    const { deps: listener, store } = deps();

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(api.callsTo('GET', '/v1/listen/messages')[0].query).toMatchObject({ wait: '0' });
    expect(store.current?.cursor).toBe('c1');
    // The background program, starting later, waits from there.
    const meanwhile = api.deliver({ text: 'while the background program starts' });
    const client = createApiClient({ apiUrl: api.url, secretKey: 'sk_test', asHost: 'claude-code' });
    const page = await waitForListenMessages(client, {
      computerId: config().computerId ?? '',
      host: 'claude-code',
      after: store.current?.cursor,
    });
    expect(page.data.map((message) => message.id)).toEqual([meanwhile.id]);
  });

  it('lets go of the lease and the service when the service can’t start, so the next try starts over', async () => {
    const { deps: listener, store, status, service, prompt } = deps();
    status.failing = true;

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow('launchctl bootstrap');

    expect(api.lease).toBeNull();
    expect(store.current?.allowedAt).toBeUndefined();
    expect(service.isInstalled()).toBe(false);

    status.failing = false;
    prompt.mockClear();
    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);
    expect(prompt).toHaveBeenCalled();
  });

  it('carries no sessions over from another agent this computer was connected to', async () => {
    const { deps: listener, store } = deps();
    await listenOn('claude-code', {}, listener);
    store.current = store.current && {
      ...store.current,
      sessions: { conv_1: { sessionId: 's1', round: 0, lastRunAt: new Date().toISOString() } },
      own: ['int_1'],
    };
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ ...config(), relayAgentIdentifier: 'other-agent' }));

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(store.current?.sessions).toEqual({});
    expect(store.current?.own).toEqual([]);
  });

  it('stops a listener running in a terminal before it listens in the background', async () => {
    const terminal = foregroundListener();
    const { deps: listener, installed } = deps();

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    await eventually(() => expect(terminal.exitCode ?? terminal.signalCode).not.toBeNull());
    expect(installed).toHaveLength(1);
  });

  it('leaves a process alone that only took the number of a listener that ended', async () => {
    const other = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
    children.push(other);
    mkdirSync(join(dir, 'listen'), { recursive: true });
    writeFileSync(join(dir, 'listen', 'foreground.json'), JSON.stringify({ pid: other.pid }));
    const { deps: listener } = deps();

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(other.exitCode ?? other.signalCode).toBeNull();
  });

  it('says when it is listening here already', async () => {
    const { deps: listener, prompt } = deps();
    await listenOn('claude-code', {}, listener);
    prompt.mockClear();

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(prompt).not.toHaveBeenCalled();
  });

  it('tells the operator in the question when the project’s allow list won’t apply yet', async () => {
    const { deps: listener, project } = deps({ personAtTerminal: false });
    mkdirSync(join(project, '.claude'), { recursive: true });
    writeFileSync(
      join(project, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Bash(npm test)'] } })
    );
    listener.env = { ...listener.env, CLAUDE_CONFIG_DIR: join(dir, 'claude-config') };
    api.decide = () => 'approved';

    await listenOn('claude-code', {}, listener);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.body).toContain('the project’s own allow list won’t apply until it is');
  });

  it('keeps Claude Code’s provider and model for the background program, and none of its secrets', async () => {
    const { deps: listener, installed } = deps();
    listener.env = {
      ...listener.env,
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_PROFILE: 'work',
      AWS_REGION: 'eu-west-1',
      ANTHROPIC_MODEL: 'claude-opus-5-5',
      ANTHROPIC_API_KEY: 'sk-ant-never-written',
      ANTHROPIC_CUSTOM_HEADERS: 'X-Secret: never written',
    };

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    expect(installed[0].env).toEqual({
      PATH: listener.env.PATH,
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_PROFILE: 'work',
      AWS_REGION: 'eu-west-1',
      ANTHROPIC_MODEL: 'claude-opus-5-5',
    });
  });

  it('says how to go on, before asking anything, when Claude Code reaches Bedrock with keys from this shell', async () => {
    const { deps: listener, prompt, installed } = deps();
    listener.env = {
      ...listener.env,
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_ACCESS_KEY_ID: 'AKIA_NEVER_WRITTEN',
      AWS_SECRET_ACCESS_KEY: 'never written',
    };

    const failed = listenOn('claude-code', {}, listener);

    await expect(failed).rejects.toThrow(
      'Claude Code signs in here with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from this shell, which listening in the background doesn’t get'
    );
    await expect(failed).rejects.toThrow(
      'Claude Code can reach Amazon Bedrock only with a sign-in it finds on this computer, which isn’t checked before it runs. If it has one, run this again with them unset.'
    );
    await expect(failed).rejects.toThrow('listen claude-code --foreground');
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
  });

  it('says how to go on, before asking anything, when Claude Code signs in only with a key from this shell', async () => {
    const { deps: listener, prompt, installed } = deps();
    listener.env = { PATH: fakeClaudeOnPath({ keyOnly: true }), HOME: dir, ANTHROPIC_API_KEY: 'sk-ant-never-written' };

    const failed = listenOn('claude-code', {}, listener);

    await expect(failed).rejects.toThrow(
      'Claude Code signs in here with ANTHROPIC_API_KEY from this shell, which listening in the background doesn’t get'
    );
    await expect(failed).rejects.toThrow('listen claude-code --foreground');
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
    expect(api.callsTo('POST', '/v1/listen/lease')).toHaveLength(0);
  });

  it('listens in this terminal with that key, as it has the shell’s variables there', async () => {
    const controller = new AbortController();
    const { deps: listener, installed } = deps({ signal: controller.signal });
    listener.env = { PATH: fakeClaudeOnPath({ keyOnly: true }), HOME: dir, ANTHROPIC_API_KEY: 'sk-ant-test' };
    listener.beforeLoop = () => controller.abort();

    expect(await listenOn('claude-code', { foreground: true }, listener)).toBe(EXIT_OK);

    expect(installed).toHaveLength(0);
  });

  it('tells the operator when Claude Code would sign in another way in the background than in this shell', async () => {
    const { deps: listener } = deps({ personAtTerminal: false });
    listener.env = { ...listener.env, ANTHROPIC_API_KEY: 'sk-ant-never-written' };
    api.decide = () => 'approved';

    expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.body).toContain(
      'there it uses the sign-in it has without it. To use it, listen in this terminal with --foreground.'
    );
    expect(JSON.stringify(question)).not.toContain('sk-ant-never-written');
  });

  it('says how to install Claude Code when it isn’t there', async () => {
    const { deps: listener } = deps();
    listener.env = { PATH: join(dir, 'nowhere'), HOME: dir };
    vi.stubEnv('HOME', dir);

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow(CLAUDE_CODE_MISSING_HELP);
  });

  it('names the hosts it can start', async () => {
    const { deps: listener } = deps();

    await expect(listenOn('chatgpt', {}, listener)).rejects.toThrow(
      'Listening starts a host on this computer: claude-code.'
    );
    await expect(listenOn('codex', {}, listener)).rejects.toThrow(
      'Listening doesn’t start Codex yet, only Claude Code.'
    );
  });

  it('needs the computer connected first', async () => {
    rmSync(join(dir, 'config.json'));
    const { deps: listener } = deps();

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow('Connect this computer first');
  });

  it('needs an account: a keyless setup doesn’t listen, and nothing is asked', async () => {
    writeFileSync(
      join(dir, 'config.json'),
      JSON.stringify({ ...config(), auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_test' } })
    );
    const { deps: listener, prompt, installed } = deps();

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow(NEEDS_ACCOUNT_MESSAGE);
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
    expect(api.calls).toHaveLength(0);
  });

  it('asks nothing while the agent is paused', async () => {
    const { deps: listener, prompt, installed } = deps();
    api.paused = true;

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow(PAUSED_MESSAGE);
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
  });

  it('sends the key only to the API it was saved for, whatever INBOX_API_URL says, and doesn’t hand that on', async () => {
    const other = await new FakeApi().start();
    try {
      vi.stubEnv('INBOX_API_URL', other.url);
      const { deps: listener, installed } = deps({ personAtTerminal: false });
      listener.env = { ...listener.env, INBOX_API_URL: other.url };
      api.decide = () => 'approved';

      expect(await listenOn('claude-code', {}, listener)).toBe(EXIT_OK);

      expect(other.calls).toHaveLength(0);
      expect(api.callsTo('POST', '/v1/listen/lease')).toHaveLength(1);
      expect(installed[0].env.INBOX_API_URL).toBeUndefined();
    } finally {
      await other.stop();
    }
  });

  it('says the key changed when the API turns the key down', async () => {
    const { deps: listener, installed } = deps();
    api.keyRejected = true;

    await expect(listenOn('claude-code', {}, listener)).rejects.toThrow(KEY_CHANGED_MESSAGE);
    expect(installed).toHaveLength(0);
  });
});

describe('listen stop', () => {
  it('stops the background program, lets go of the lease, and keeps only the sessions', async () => {
    const { deps: listener, store, service } = deps();
    await listenOn('claude-code', {}, listener);
    store.current = store.current && {
      ...store.current,
      cursor: 'c4',
      sessions: { conv_1: { sessionId: 's1', round: 0, lastRunAt: new Date().toISOString() } },
    };

    expect(await listenStop(listener)).toBe(EXIT_OK);

    expect(service.isInstalled()).toBe(false);
    expect(api.callsTo('POST', '/v1/listen/lease/release')[0].body).toEqual({
      computerId: config().computerId,
      host: 'claude-code',
    });
    expect(api.lease).toBeNull();
    expect(store.current?.allowedAt).toBeUndefined();
    expect(store.current?.cursor).toBeUndefined();
    expect(store.current?.sessions.conv_1?.sessionId).toBe('s1');
  });

  it('lets go of the lease even while the agent is paused', async () => {
    const { deps: listener, service, lines } = deps();
    await listenOn('claude-code', {}, listener);
    api.paused = true;
    lines.length = 0;

    expect(await listenStop(listener)).toBe(EXIT_OK);

    expect(service.isInstalled()).toBe(false);
    expect(api.lease).toBeNull();
    expect(lines).toEqual(['This computer isn’t listening for Claude Code any more.']);
  });

  it('stops a listener running in a terminal too', async () => {
    const { deps: listener } = deps();
    await listenOn('claude-code', {}, listener);
    const terminal = foregroundListener();

    expect(await listenStop(listener)).toBe(EXIT_OK);

    await eventually(() => expect(terminal.exitCode ?? terminal.signalCode).not.toBeNull());
    expect(fileForeground.running()).toBeNull();
  });

  it('ends a listener in a terminal that doesn’t stop in time, so it can’t touch the next one’s lease or state', async () => {
    // One still stopping its run: it doesn't end on SIGTERM by itself.
    const terminal = spawn(process.execPath, [
      '-e',
      'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)',
      'listen',
      'claude-code',
      '--foreground',
    ]);
    children.push(terminal);
    fileForeground.claim(terminal.pid ?? 0);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(await stopForeground(fileForeground, 300)).toBe(true);

    await eventually(() => expect(terminal.signalCode).toBe('SIGKILL'));
    expect(fileForeground.running()).toBeNull();
  });

  it('leaves another computer’s listener alone and says where it is', async () => {
    api.takeOverElsewhere('codex');
    const { deps: listener, lines } = deps();

    await listenStop(listener);

    expect(lines).toContain('Nothing was listening on this computer.');
    expect(lines).toContain('It’s listening on Desktop: run `npx @agentinbox/cli listen stop` there to stop it.');
    expect(api.lease?.computerName).toBe('Desktop');
  });
});

describe('listen status', () => {
  it('says where the agent is listening and what this computer does', async () => {
    const { deps: listener, lines, project } = deps();
    await listenOn('claude-code', {}, listener);
    lines.length = 0;

    expect(await listenStatus({}, listener)).toBe(EXIT_OK);

    expect(lines[0]).toMatch(
      new RegExp(`^Listening on MacBook \\(this computer\\): Claude Code, in ${project}, for \\d+s now\\.$`)
    );
    expect(lines[1]).toBe(`This computer listens for Claude Code in ${project}, in the background (launchd).`);
  });

  it('says the agent is paused, where it is still listening, and what this computer does', async () => {
    const { deps: listener, lines, project } = deps();
    await listenOn('claude-code', {}, listener);
    api.paused = true;
    lines.length = 0;

    expect(await listenStatus({}, listener)).toBe(EXIT_OK);

    expect(lines[0]).toBe(PAUSED_MESSAGE);
    expect(lines[1]).toMatch(/^Listening on MacBook \(this computer\): Claude Code, in .+, for \d+s now\.$/);
    expect(lines[2]).toBe(`This computer listens for Claude Code in ${project}, in the background (launchd).`);

    // Once the lease lapsed while paused, the pause says it all.
    api.lease = null;
    lines.length = 0;
    await listenStatus({}, listener);
    expect(lines[0]).toBe(PAUSED_MESSAGE);
    expect(lines[1]).toBe(`This computer listens for Claude Code in ${project}, in the background (launchd).`);

    lines.length = 0;
    await listenStatus({ json: true }, listener);
    expect(JSON.parse(lines.join('\n'))).toMatchObject({ listening: null, paused: true });
  });

  it('prints JSON for agents', async () => {
    const { deps: listener, lines } = deps();

    await listenStatus({ json: true }, listener);

    expect(JSON.parse(lines.join('\n'))).toMatchObject({
      listening: null,
      thisComputer: { listeningHere: false, host: null },
    });
  });
});

describe('listen run', { timeout: 20_000 }, () => {
  it('exits cleanly, without waiting, once it stopped for good', async () => {
    const { deps: listener, store, lines } = deps();
    store.current = {
      ...newState({
        host: 'claude-code',
        project: dir,
        program: { command: 'claude', args: [] },
        limits: { runsPerHour: 20, maxRunSeconds: 60 },
      }),
      allowedAt: new Date().toISOString(),
      stopped: { reason: 'key_changed', message: KEY_CHANGED_MESSAGE, at: new Date().toISOString() },
    };

    expect(await listenRun(listener)).toBe(EXIT_OK);

    expect(lines).toEqual([`Stopped: ${KEY_CHANGED_MESSAGE}`]);
    expect(api.calls).toHaveLength(0);
  });

  it('waits on the API it was saved for, whatever INBOX_API_URL says', async () => {
    const other = await new FakeApi().start();
    const controller = new AbortController();
    try {
      const { deps: listener } = deps({ signal: controller.signal });
      await listenOn('claude-code', {}, listener);
      const waits = api.callsTo('GET', '/v1/listen/messages').length;
      vi.stubEnv('INBOX_API_URL', other.url);

      const running = listenRun({ ...listener, env: { ...listener.env, INBOX_API_URL: other.url } });
      await eventually(() => expect(api.callsTo('GET', '/v1/listen/messages').length).toBeGreaterThan(waits));
      controller.abort();

      expect(await running).toBe(EXIT_OK);
      expect(other.calls).toHaveLength(0);
    } finally {
      controller.abort();
      await other.stop();
    }
  });

  it('stops, without running anything, once this computer is connected anew', async () => {
    for (const change of [{ relayAgentIdentifier: 'other-agent' }, { auth: { mode: 'apiKey', secretKey: 'sk_new' } }]) {
      const { deps: listener, store, lines } = deps();
      await listenOn('claude-code', {}, listener);
      const saved = config();
      writeFileSync(join(dir, 'config.json'), JSON.stringify({ ...saved, ...change }));
      const waits = api.callsTo('GET', '/v1/listen/messages').length;

      expect(await listenRun(listener)).toBe(EXIT_OK);

      expect(lines.at(-1)).toMatch(/^Stopped: This computer was connected anew/);
      expect(store.current?.stopped?.reason).toBe('connection_changed');
      expect(api.callsTo('GET', '/v1/listen/messages')).toHaveLength(waits);
      writeFileSync(join(dir, 'config.json'), JSON.stringify(saved));
    }
  });

  it('stops, and starts nothing more, once this computer is connected anew while it listens', async () => {
    const { deps: listener, store } = deps();
    await listenOn('claude-code', {}, listener);
    const waits = api.callsTo('GET', '/v1/listen/messages').length;
    const running = listenRun(listener);
    await eventually(() => expect(api.callsTo('GET', '/v1/listen/messages').length).toBeGreaterThan(waits));

    writeFileSync(join(dir, 'config.json'), JSON.stringify({ ...config(), relayAgentIdentifier: 'other-agent' }));
    api.deliver({ text: 'hello' });

    expect(await running).toBe(EXIT_OK);
    expect(store.current?.stopped?.reason).toBe('connection_changed');
    expect(api.sentInto('conv_1')).toEqual([]);
  });

  it('does nothing where listening was never allowed', async () => {
    const { deps: listener, lines } = deps();

    expect(await listenRun(listener)).toBe(EXIT_OK);

    expect(lines[0]).toContain('Listening isn’t turned on here.');
  });
});
