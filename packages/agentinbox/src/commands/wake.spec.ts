import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../api/client';
import { waitForWakeMessages } from '../api/wake';
import type { CliConfig } from '../config';
import { EXIT_DENIED, EXIT_OK, EXIT_TIMEOUT } from '../output';
import type { AskedAllow, AskedStore } from '../wake/allow';
import { CLAUDE_CODE_MISSING_HELP } from '../wake/claude-code';
import { FakeApi } from '../wake/fake-api.fixture';
import { fileForeground } from '../wake/foreground';
import { loadHost } from '../wake/hosts';
import type { BackgroundCommand, ServiceManager } from '../wake/service';
import { memoryState, newState } from '../wake/state';
import { KEY_CHANGED_MESSAGE, NEEDS_ACCOUNT_MESSAGE, PAUSED_MESSAGE } from '../wake/words';
import { type WakeDeps, wakeOn, wakeRun, wakeStatus, wakeStop } from './wake';

const FAKE_CLAUDE = fileURLToPath(new URL('../wake/fake-claude.fixture.mjs', import.meta.url));

let dir: string;
let api: FakeApi;
/** Processes a test started, ended after it. */
const children: ChildProcess[] = [];

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'wake-command-'));
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

/** A `claude` on a PATH of its own: the fake, behind a small launcher. */
function fakeClaudeOnPath(): string {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_CLAUDE}" "$@"\n`);
  chmodSync(join(bin, 'claude'), 0o755);

  return bin;
}

function fakeService() {
  const installed: BackgroundCommand[] = [];
  /** `failing`: the service manager turns it down after its file is written, as launchctl's bootstrap can. */
  const status = { present: false, failing: false };
  const service: ServiceManager = {
    kind: 'launchd',
    file: join(dir, 'md.agentinbox.wake.plist'),
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

function deps(overrides: Partial<WakeDeps> & { answer?: string; personAtTerminal?: boolean } = {}) {
  const lines: string[] = [];
  const project = join(dir, 'project');
  mkdirSync(project, { recursive: true });
  const { service, installed, status } = fakeService();
  const store = memoryState();
  const asked = memoryAsked();
  const prompt = vi.fn().mockResolvedValue(overrides.answer ?? 'y');
  const result: WakeDeps = {
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

/** A process that looks like a wake in a terminal (`wake claude-code --foreground`), with its number kept. */
function foregroundWake(): ChildProcess {
  const terminal = spawn(process.execPath, [
    '-e',
    'setInterval(() => {}, 1000)',
    'wake',
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

describe('wake <host>', { timeout: 20_000 }, () => {
  it('asks a person at the terminal, then keeps Claude Code awake in the background', async () => {
    const { deps: wake, prompt, installed, store, project } = deps();

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    expect(prompt).toHaveBeenCalledWith(`Keep Claude Code awake on MacBook, in ${project}? [y/N] `);
    const computerId = config().computerId;
    expect(computerId).toMatch(/^cmp_[A-Za-z0-9_-]{16,}$/);
    expect(api.callsTo('POST', '/v1/wake/lease')[0].body).toEqual({
      computerId,
      computerName: 'MacBook',
      host: 'claude-code',
      project,
    });
    expect(api.lease).toMatchObject({ computerId, host: 'claude-code' });
    expect(installed[0].argv).toEqual([process.execPath, '/opt/agentinbox/dist/src/index.js', 'wake', 'run']);
    expect(installed[0].workingDirectory).toBe(project);
    expect(store.current).toMatchObject({
      host: 'claude-code',
      project,
      limits: { wakesPerHour: 20, maxRunSeconds: 1800 },
    });
    expect(store.current?.allowedAt).toBeTruthy();
    // Every call is Claude Code's.
    expect(api.calls.every((call) => call.host === 'claude-code')).toBe(true);
  });

  it('takes nothing when the person says no', async () => {
    const { deps: wake, installed } = deps({ answer: 'n' });

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_DENIED);

    expect(api.callsTo('POST', '/v1/wake/lease')).toHaveLength(0);
    expect(installed).toHaveLength(0);
  });

  it('asks the operator with an approve when an agent ran it, and takes nothing until they allow it', async () => {
    const { deps: wake, installed, project } = deps({ personAtTerminal: false });
    api.decide = () => 'approved';

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question).toMatchObject({ to: 'ada', from: 'Claude Code', ttlSeconds: 3600 });
    expect(question?.card).toMatchObject({
      title: `Keep Claude Code awake on MacBook, in ${project}?`,
      approveLabel: 'Allow',
      denyLabel: 'Deny',
    });
    expect(api.lease?.host).toBe('claude-code');
    expect(installed).toHaveLength(1);
  });

  it('stops when the operator denies it', async () => {
    const { deps: wake, installed, lines } = deps({ personAtTerminal: false });
    api.decide = () => 'denied';

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_DENIED);

    expect(lines).toContain('Not kept awake: your operator said no.');
    expect(api.lease).toBeNull();
    expect(installed).toHaveLength(0);
  });

  it('goes on waiting on the same question when it is run again', async () => {
    const { deps: wake, asked, installed } = deps({ personAtTerminal: false });

    expect(await wakeOn('claude-code', { timeout: '1s' }, wake)).toBe(EXIT_TIMEOUT);
    expect(asked.current?.interactionId).toBeTruthy();
    expect(installed).toHaveLength(0);

    const questionId = asked.current?.interactionId ?? '';
    setTimeout(() => api.answer(questionId, 'approved'), 300);
    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    expect(api.interactions.filter((interaction) => interaction.kind === 'approve')).toHaveLength(1);
    expect(asked.current).toBeNull();
    expect(installed).toHaveLength(1);
  });

  it('asks before moving it from another computer, and takes it over once allowed', async () => {
    api.takeOverElsewhere('codex');
    const { deps: wake } = deps({ personAtTerminal: false });
    api.decide = () => 'approved';

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.body).toContain('It is awake on Desktop now (Codex, in ~/work); this moves it here.');
    expect(api.callsTo('POST', '/v1/wake/lease')[0].body).toMatchObject({ takeOver: true });
    expect(api.lease?.computerId).toBe(config().computerId);
  });

  it('knows where waiting starts before it says it is awake, so a message sent meanwhile isn’t missed', async () => {
    api.deliver({ text: 'before it was turned on' });
    const { deps: wake, store } = deps();

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    expect(api.callsTo('GET', '/v1/wake/messages')[0].query).toMatchObject({ wait: '0' });
    expect(store.current?.cursor).toBe('c1');
    // The background program, starting later, waits from there.
    const meanwhile = api.deliver({ text: 'while the background program starts' });
    const client = createApiClient({ apiUrl: api.url, secretKey: 'sk_test', asHost: 'claude-code' });
    const page = await waitForWakeMessages(client, {
      computerId: config().computerId ?? '',
      host: 'claude-code',
      after: store.current?.cursor,
    });
    expect(page.data.map((message) => message.id)).toEqual([meanwhile.id]);
  });

  it('lets go of the lease and the service when the service can’t start, so the next try starts over', async () => {
    const { deps: wake, store, status, service, prompt } = deps();
    status.failing = true;

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow('launchctl bootstrap');

    expect(api.lease).toBeNull();
    expect(store.current?.allowedAt).toBeUndefined();
    expect(service.isInstalled()).toBe(false);

    status.failing = false;
    prompt.mockClear();
    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);
    expect(prompt).toHaveBeenCalled();
  });

  it('carries no sessions over from another agent this computer was connected to', async () => {
    const { deps: wake, store } = deps();
    await wakeOn('claude-code', {}, wake);
    store.current = store.current && {
      ...store.current,
      sessions: { conv_1: { sessionId: 's1', round: 0, lastWakeAt: new Date().toISOString() } },
      own: ['int_1'],
    };
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ ...config(), relayAgentIdentifier: 'other-agent' }));

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    expect(store.current?.sessions).toEqual({});
    expect(store.current?.own).toEqual([]);
  });

  it('stops a wake running in a terminal before it keeps it awake in the background', async () => {
    const terminal = foregroundWake();
    const { deps: wake, installed } = deps();

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    await eventually(() => expect(terminal.exitCode ?? terminal.signalCode).not.toBeNull());
    expect(installed).toHaveLength(1);
  });

  it('leaves a process alone that only took the number of a wake that ended', async () => {
    const other = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
    children.push(other);
    mkdirSync(join(dir, 'wake'), { recursive: true });
    writeFileSync(join(dir, 'wake', 'foreground.json'), JSON.stringify({ pid: other.pid }));
    const { deps: wake } = deps();

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(other.exitCode ?? other.signalCode).toBeNull();
  });

  it('says when it is awake here already', async () => {
    const { deps: wake, prompt } = deps();
    await wakeOn('claude-code', {}, wake);
    prompt.mockClear();

    expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

    expect(prompt).not.toHaveBeenCalled();
  });

  it('tells the operator in the question when the project’s allow list won’t apply yet', async () => {
    const { deps: wake, project } = deps({ personAtTerminal: false });
    mkdirSync(join(project, '.claude'), { recursive: true });
    writeFileSync(
      join(project, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Bash(npm test)'] } })
    );
    wake.env = { ...wake.env, CLAUDE_CONFIG_DIR: join(dir, 'claude-config') };
    api.decide = () => 'approved';

    await wakeOn('claude-code', {}, wake);

    const question = api.interactions.find((interaction) => interaction.kind === 'approve');
    expect(question?.card.body).toContain('the project’s own allow list won’t apply until it is');
  });

  it('says how to install Claude Code when it isn’t there', async () => {
    const { deps: wake } = deps();
    wake.env = { PATH: join(dir, 'nowhere'), HOME: dir };
    vi.stubEnv('HOME', dir);

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow(CLAUDE_CODE_MISSING_HELP);
  });

  it('names the hosts it can wake', async () => {
    const { deps: wake } = deps();

    await expect(wakeOn('chatgpt', {}, wake)).rejects.toThrow('Wake starts a host on this computer: claude-code.');
    await expect(wakeOn('codex', {}, wake)).rejects.toThrow('Wake doesn’t start Codex yet, only Claude Code.');
  });

  it('needs the computer connected first', async () => {
    rmSync(join(dir, 'config.json'));
    const { deps: wake } = deps();

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow('Connect this computer first');
  });

  it('needs an account: a keyless setup isn’t kept awake, and nothing is asked', async () => {
    writeFileSync(
      join(dir, 'config.json'),
      JSON.stringify({ ...config(), auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_test' } })
    );
    const { deps: wake, prompt, installed } = deps();

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow(NEEDS_ACCOUNT_MESSAGE);
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
    expect(api.calls).toHaveLength(0);
  });

  it('asks nothing while the agent is paused', async () => {
    const { deps: wake, prompt, installed } = deps();
    api.paused = true;

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow(PAUSED_MESSAGE);
    expect(prompt).not.toHaveBeenCalled();
    expect(installed).toHaveLength(0);
  });

  it('sends the key only to the API it was saved for, whatever INBOX_API_URL says, and doesn’t hand that on', async () => {
    const other = await new FakeApi().start();
    try {
      vi.stubEnv('INBOX_API_URL', other.url);
      const { deps: wake, installed } = deps({ personAtTerminal: false });
      wake.env = { ...wake.env, INBOX_API_URL: other.url };
      api.decide = () => 'approved';

      expect(await wakeOn('claude-code', {}, wake)).toBe(EXIT_OK);

      expect(other.calls).toHaveLength(0);
      expect(api.callsTo('POST', '/v1/wake/lease')).toHaveLength(1);
      expect(installed[0].env.INBOX_API_URL).toBeUndefined();
    } finally {
      await other.stop();
    }
  });

  it('says the key changed when the API turns the key down', async () => {
    const { deps: wake, installed } = deps();
    api.keyRejected = true;

    await expect(wakeOn('claude-code', {}, wake)).rejects.toThrow(KEY_CHANGED_MESSAGE);
    expect(installed).toHaveLength(0);
  });
});

describe('wake stop', () => {
  it('stops the background program, lets go of the lease, and keeps only the sessions', async () => {
    const { deps: wake, store, service } = deps();
    await wakeOn('claude-code', {}, wake);
    store.current = store.current && {
      ...store.current,
      cursor: 'c4',
      sessions: { conv_1: { sessionId: 's1', round: 0, lastWakeAt: new Date().toISOString() } },
    };

    expect(await wakeStop(wake)).toBe(EXIT_OK);

    expect(service.isInstalled()).toBe(false);
    expect(api.callsTo('POST', '/v1/wake/lease/release')[0].body).toEqual({
      computerId: config().computerId,
      host: 'claude-code',
    });
    expect(api.lease).toBeNull();
    expect(store.current?.allowedAt).toBeUndefined();
    expect(store.current?.cursor).toBeUndefined();
    expect(store.current?.sessions.conv_1?.sessionId).toBe('s1');
  });

  it('lets go of the lease even while the agent is paused', async () => {
    const { deps: wake, service, lines } = deps();
    await wakeOn('claude-code', {}, wake);
    api.paused = true;
    lines.length = 0;

    expect(await wakeStop(wake)).toBe(EXIT_OK);

    expect(service.isInstalled()).toBe(false);
    expect(api.lease).toBeNull();
    expect(lines).toEqual(['Claude Code isn’t kept awake on this computer any more.']);
  });

  it('stops a wake running in a terminal too', async () => {
    const { deps: wake } = deps();
    await wakeOn('claude-code', {}, wake);
    const terminal = foregroundWake();

    expect(await wakeStop(wake)).toBe(EXIT_OK);

    await eventually(() => expect(terminal.exitCode ?? terminal.signalCode).not.toBeNull());
    expect(fileForeground.running()).toBeNull();
  });

  it('leaves another computer’s wake alone and says where it is', async () => {
    api.takeOverElsewhere('codex');
    const { deps: wake, lines } = deps();

    await wakeStop(wake);

    expect(lines).toContain('Nothing was kept awake on this computer.');
    expect(lines).toContain('It’s awake on Desktop: run `npx @agentinbox/cli wake stop` there to stop it.');
    expect(api.lease?.computerName).toBe('Desktop');
  });
});

describe('wake status', () => {
  it('says where the agent is awake and what this computer does', async () => {
    const { deps: wake, lines, project } = deps();
    await wakeOn('claude-code', {}, wake);
    lines.length = 0;

    expect(await wakeStatus({}, wake)).toBe(EXIT_OK);

    expect(lines[0]).toMatch(
      new RegExp(`^Awake on MacBook \\(this computer\\): Claude Code, in ${project}, for \\d+s now\\.$`)
    );
    expect(lines[1]).toBe(`This computer keeps Claude Code awake for ${project}, in the background (launchd).`);
  });

  it('says the agent is paused, where it is still awake, and what this computer does', async () => {
    const { deps: wake, lines, project } = deps();
    await wakeOn('claude-code', {}, wake);
    api.paused = true;
    lines.length = 0;

    expect(await wakeStatus({}, wake)).toBe(EXIT_OK);

    expect(lines[0]).toBe(PAUSED_MESSAGE);
    expect(lines[1]).toMatch(/^Awake on MacBook \(this computer\): Claude Code, in .+, for \d+s now\.$/);
    expect(lines[2]).toBe(`This computer keeps Claude Code awake for ${project}, in the background (launchd).`);

    // Once the lease lapsed while paused, the pause says it all.
    api.lease = null;
    lines.length = 0;
    await wakeStatus({}, wake);
    expect(lines[0]).toBe(PAUSED_MESSAGE);
    expect(lines[1]).toBe(`This computer keeps Claude Code awake for ${project}, in the background (launchd).`);

    lines.length = 0;
    await wakeStatus({ json: true }, wake);
    expect(JSON.parse(lines.join('\n'))).toMatchObject({ awake: null, paused: true });
  });

  it('prints JSON for agents', async () => {
    const { deps: wake, lines } = deps();

    await wakeStatus({ json: true }, wake);

    expect(JSON.parse(lines.join('\n'))).toMatchObject({ awake: null, thisComputer: { awakeHere: false, host: null } });
  });
});

describe('wake run', { timeout: 20_000 }, () => {
  it('exits cleanly, without waiting, once it stopped for good', async () => {
    const { deps: wake, store, lines } = deps();
    store.current = {
      ...newState({
        host: 'claude-code',
        project: dir,
        program: { command: 'claude', args: [] },
        limits: { wakesPerHour: 20, maxRunSeconds: 60 },
      }),
      allowedAt: new Date().toISOString(),
      stopped: { reason: 'key_changed', message: KEY_CHANGED_MESSAGE, at: new Date().toISOString() },
    };

    expect(await wakeRun(wake)).toBe(EXIT_OK);

    expect(lines).toEqual([`Stopped: ${KEY_CHANGED_MESSAGE}`]);
    expect(api.calls).toHaveLength(0);
  });

  it('waits on the API it was saved for, whatever INBOX_API_URL says', async () => {
    const other = await new FakeApi().start();
    const controller = new AbortController();
    try {
      const { deps: wake } = deps({ signal: controller.signal });
      await wakeOn('claude-code', {}, wake);
      const waits = api.callsTo('GET', '/v1/wake/messages').length;
      vi.stubEnv('INBOX_API_URL', other.url);

      const running = wakeRun({ ...wake, env: { ...wake.env, INBOX_API_URL: other.url } });
      await eventually(() => expect(api.callsTo('GET', '/v1/wake/messages').length).toBeGreaterThan(waits));
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
      const { deps: wake, store, lines } = deps();
      await wakeOn('claude-code', {}, wake);
      const saved = config();
      writeFileSync(join(dir, 'config.json'), JSON.stringify({ ...saved, ...change }));
      const waits = api.callsTo('GET', '/v1/wake/messages').length;

      expect(await wakeRun(wake)).toBe(EXIT_OK);

      expect(lines.at(-1)).toMatch(/^Stopped: This computer was connected anew/);
      expect(store.current?.stopped?.reason).toBe('connection_changed');
      expect(api.callsTo('GET', '/v1/wake/messages')).toHaveLength(waits);
      writeFileSync(join(dir, 'config.json'), JSON.stringify(saved));
    }
  });

  it('does nothing where wake was never allowed', async () => {
    const { deps: wake, lines } = deps();

    expect(await wakeRun(wake)).toBe(EXIT_OK);

    expect(lines[0]).toContain('Wake isn’t turned on here.');
  });
});
