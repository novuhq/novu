import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CliConfig } from '../config';
import { EXIT_DENIED, EXIT_OK, EXIT_TIMEOUT } from '../output';
import type { AskedAllow, AskedStore } from '../wake/allow';
import { CLAUDE_CODE_MISSING_HELP } from '../wake/claude-code';
import { FakeApi } from '../wake/fake-api.fixture';
import { loadHost } from '../wake/hosts';
import type { BackgroundCommand, ServiceManager } from '../wake/service';
import { memoryState, newState } from '../wake/state';
import { KEY_CHANGED_MESSAGE, NEEDS_ACCOUNT_MESSAGE, PAUSED_MESSAGE } from '../wake/words';
import { type WakeDeps, wakeOn, wakeRun, wakeStatus, wakeStop } from './wake';

const FAKE_CLAUDE = fileURLToPath(new URL('../wake/fake-claude.fixture.mjs', import.meta.url));

let dir: string;
let api: FakeApi;

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
  let present = false;
  const service: ServiceManager = {
    kind: 'launchd',
    file: join(dir, 'md.agentinbox.wake.plist'),
    render: () => '',
    install: (command) => {
      installed.push(command);
      present = true;
    },
    uninstall: () => {
      const had = present;
      present = false;

      return had;
    },
    isInstalled: () => present,
    isRunning: () => present,
  };

  return { service, installed };
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
  const { service, installed } = fakeService();
  const store = memoryState();
  const asked = memoryAsked();
  const prompt = vi.fn().mockResolvedValue(overrides.answer ?? 'y');
  const result: WakeDeps = {
    store,
    asked,
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

  return { deps: result, lines, store, asked, service, installed, prompt, project };
}

function config(): CliConfig {
  return JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')) as CliConfig;
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

describe('wake run', () => {
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

  it('does nothing where wake was never allowed', async () => {
    const { deps: wake, lines } = deps();

    expect(await wakeRun(wake)).toBe(EXIT_OK);

    expect(lines[0]).toContain('Wake isn’t turned on here.');
  });
});
