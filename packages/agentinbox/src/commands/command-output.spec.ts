import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { CliConfig } from '../config';
import { setOpenedScreen } from '../screen/opened';
import { stripEscapes } from '../screen/terminal';
import { VirtualTerminal } from '../screen/virtual-terminal.fixture';

/**
 * What `setup`, `login` and `connect` print, start to end. Without a terminal it is byte for byte what they
 * printed before the screen. On one, everything they printed is on the screen they leave, with the same words.
 */

/** What a person types at the prompts, in turn. */
const typed = vi.hoisted(() => [] as string[]);

// A terminal's readline: it writes the question and echoes the answer as it is typed.
vi.mock('node:readline', () => {
  const createInterface = () => ({
    question: (question: string, answer: (text: string) => void) => {
      const text = typed.shift() ?? '';
      process.stdout.write(`${question}${text}\n`);
      answer(text);
    },
    close: () => undefined,
  });

  return { default: { createInterface }, createInterface };
});

const loadConfig = vi.fn();
const saveConfig = vi.fn();
const waitForVerifiedEmail = vi.fn();
const waitForEndpoint = vi.fn();
const startLoginRequest = vi.fn();
const checkLoginRequest = vi.fn();
const findOperator = vi.fn();
const connectWithCode = vi.fn();
const hasChannelEndpoint = vi.fn();

vi.mock('../api/setup', () => ({
  bootstrapKeylessSession: vi.fn(async () => 'pk_keyless_1'),
  addAgentEmailIntegration: vi.fn(async () => ({
    integration: { identifier: 'agent-email', sharedInboundAddress: 'atlas-x1@agentinbox.md' },
  })),
  listAgentIntegrations: vi.fn(async () => [
    { integration: { identifier: 'telegram-1', providerId: 'telegram', active: true } },
  ]),
  listIntegrations: vi.fn(async () => []),
  linkAgentIntegration: vi.fn(),
  createTelegramIntegration: vi.fn(),
  hasChannelEndpoint: (...args: unknown[]) => hasChannelEndpoint(...args),
  issueTelegramSubscriberLink: vi.fn(async () => ({
    deepLinkUrl: 'https://t.me/atlas_bot?start=abc',
    botUsername: 'atlas_bot',
  })),
}));

vi.mock('../api/agent-inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setupRelay: vi.fn(async (_client: unknown, input: { subscriberId: string }) => ({
    agentId: 'agent_1',
    agentIdentifier: 'human-relay',
    agentName: 'Atlas',
    subscriberId: input.subscriberId,
  })),
  requestAddressVerification: vi.fn(async () => ({
    address: 'a***@example.com',
    requestedAt: '2026-10-16T10:00:00.000Z',
  })),
  createInteraction: vi.fn(async () => ({ id: 'int_1', status: 'delivered' })),
}));

vi.mock('../api/login', () => ({
  startLoginRequest: (...args: unknown[]) => startLoginRequest(...args),
  checkLoginRequest: (...args: unknown[]) => checkLoginRequest(...args),
  getKeylessClaimToken: vi.fn(async () => null),
  hasSubscriber: vi.fn(async () => true),
  findOperator: (...args: unknown[]) => findOperator(...args),
}));

vi.mock('../api/connect', () => ({
  connectWithCode: (...args: unknown[]) => connectWithCode(...args),
}));

vi.mock('../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config')>()),
  loadConfig: () => loadConfig(),
  saveConfig: (...args: unknown[]) => saveConfig(...args),
}));

vi.mock('./link-channel', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  waitForVerifiedEmail: (...args: unknown[]) => waitForVerifiedEmail(...args),
  waitForEndpoint: (...args: unknown[]) => waitForEndpoint(...args),
}));

vi.mock('../open-browser', () => ({ openInBrowser: vi.fn() }));
vi.mock('../poll', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../poll')>()),
  sleep: () => Promise.resolve(),
}));

const { setupCommand } = await import('./setup');
const { loginCommand } = await import('./login');
const { connectCommand } = await import('./connect');

const accountConfig: CliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'sk_account' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'ada',
  defaultChannel: 'telegram',
};

/** The commands as the tests run them, each with the answers its story needs. */
const run = {
  keylessSetup: async () => {
    loadConfig.mockReturnValue(null);
    await setupCommand(undefined, { email: 'ada@example.com' });
  },
  telegramSetup: async () => {
    loadConfig.mockReturnValue(accountConfig);
    await setupCommand('telegram', {});
  },
  telegramSetupTimesOut: async () => {
    loadConfig.mockReturnValue(accountConfig);
    waitForEndpoint.mockRejectedValue(
      new Error("We didn't see your /start on @atlas_bot within 300s. Re-run `npx @agentinbox/cli setup` to continue.")
    );
    await setupCommand('telegram', {});
  },
  telegramConnectedAlready: async () => {
    loadConfig.mockReturnValue(accountConfig);
    hasChannelEndpoint.mockResolvedValue(true);
    await setupCommand('telegram', {});
  },
  login: async () => {
    findOperator.mockResolvedValue('ada_owner');
    await loginCommand({});
  },
  deniedLogin: async () => {
    checkLoginRequest.mockResolvedValue({ status: 'denied' });
    await loginCommand({});
  },
  connect: async () => {
    await connectCommand('atlas', { code: 'BCDF-GHJK' });
  },
  connectOverSetup: async () => {
    loadConfig.mockReturnValue(accountConfig);
    await connectCommand('atlas', { code: 'BCDF-GHJK' });
  },
  expiredCode: async () => {
    connectWithCode.mockRejectedValue(
      new ApiError('This code expired.', 410, 'POST /v1/connect', { code: 'connect_code_expired' })
    );
    await connectCommand('atlas', { code: 'BCDF-GHJK' });
  },
};

/** What the output depends on in the environment; each test starts with only what it sets. */
const ENV_KEYS = [
  'NO_COLOR',
  'CI',
  'TERM',
  'COLORTERM',
  'FORCE_COLOR',
  'INBOX_CONFIG',
  'INBOX_API_URL',
  'INBOX_SECRET_KEY',
  'AGENTINBOX_NO_ANIMATION',
  'AGENTINBOX_MASCOT_ASPECT',
];
const STREAM_PROPERTIES = ['isTTY', 'columns', 'rows'] as const;

let stdout: string;
let stderr: string;
let exit: MockInstance;
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const savedStreams = [process.stdout, process.stderr, process.stdin].map((stream) => ({
  stream,
  properties: STREAM_PROPERTIES.map((name) => [name, Object.getOwnPropertyDescriptor(stream, name)] as const),
}));

/** Thrown where a failing command exits, so it stops there as it would for real. */
class ExitCalled extends Error {}

/**
 * Where the output goes: a pipe; a person's `terminal` (stdout and stderr both one, with 24-bit colour); or
 * `stdout` alone as a terminal, with stderr going elsewhere. Stdin is a terminal only where `typing`.
 */
type Streams = 'pipe' | 'terminal' | 'stdout';

interface Size {
  columns?: number;
  rows?: number;
  typing?: boolean;
}

function streamsAre(kind: Streams, { columns = 100, rows = 40, typing = false }: Size = {}) {
  Object.defineProperty(process.stdout, 'isTTY', { value: kind !== 'pipe', configurable: true });
  Object.defineProperty(process.stdout, 'columns', { value: columns, configurable: true });
  Object.defineProperty(process.stdout, 'rows', { value: rows, configurable: true });
  Object.defineProperty(process.stderr, 'isTTY', { value: kind === 'terminal', configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: typing, configurable: true });
}

/** Runs one of {@link run} with its output going to `kind`, from a clean start, and returns what it printed. */
async function printed(scenario: keyof typeof run, kind: Streams = 'pipe', size: Size = {}) {
  vi.clearAllMocks();
  stdout = '';
  stderr = '';
  streamsAre(kind, size);

  loadConfig.mockReset().mockReturnValue(null);
  waitForVerifiedEmail.mockReset().mockResolvedValue(undefined);
  waitForEndpoint.mockReset().mockResolvedValue(undefined);
  hasChannelEndpoint.mockReset().mockResolvedValue(false);
  startLoginRequest.mockReset().mockResolvedValue({
    deviceCode: 'device_code',
    expiresIn: 1800,
    interval: 2,
    verificationUrl: 'https://agentinbox.md/cli/login?code=BCDF-GHJK',
    userCode: 'BCDF-GHJK',
  });
  checkLoginRequest.mockReset().mockResolvedValue({
    status: 'approved',
    apiKey: 'sk_account',
    environmentId: 'dev_env',
    user: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
  });
  findOperator.mockReset().mockResolvedValue('ada');
  connectWithCode.mockReset().mockResolvedValue({
    apiKey: 'sk_account',
    environmentId: 'env_1',
    agent: { identifier: 'human-relay', name: 'Atlas', handle: 'atlas' },
  });

  try {
    await run[scenario]();
  } catch (err) {
    // Where the command exits with an error, the test stops it there, as the real exit would.
    if (!(err instanceof ExitCalled)) throw err;
  }

  return { stdout, stderr, exitCode: exit.mock.calls[0]?.[0] };
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  process.env.COLORTERM = 'truecolor';
  process.env.INBOX_CONFIG = '/home/ada/.agentinbox/config.json';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdout += String(chunk);

    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderr += String(chunk);

    return true;
  });
  // A successful run exits 0 as its last step; a failing one is stopped where it exits.
  exit = vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
    if (code !== 0) throw new ExitCalled(`exit ${code}`);
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  setOpenedScreen(null);
  typed.length = 0;

  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  for (const { stream, properties } of savedStreams) {
    for (const [name, descriptor] of properties) {
      if (descriptor) {
        Object.defineProperty(stream, name, descriptor);
      } else {
        delete (stream as unknown as Record<string, unknown>)[name];
      }
    }
  }
});

describe('without a terminal', () => {
  it('keeps a keyless setup that verifies the email as it was', async () => {
    const output = await printed('keylessSetup');

    expect(output.exitCode).toBe(0);
    expect(output.stdout).toMatchInlineSnapshot(`
      "• Creating a keyless inbox (no account needed)...
      • Setting up your agent inbox...
      • Your agent inbox is atlas-x1@agentinbox.md.
      • Registering your email address...
      • Verification email sent to ada@example.com (shown as a***@example.com).
      • Replies go to atlas-x1@agentinbox.md — answering an interaction is just replying to its email.
      • Outbound email starts after you claim this setup — use the link in that email, or run \`npx @agentinbox/cli login\`.
      • Saved config to /home/ada/.agentinbox/config.json.
      • This is a free demo without an account. Run npx @agentinbox/cli login anytime to keep it in a Agent Inbox account.
      • Teach your coding agent to use the inbox: npx skills add agentinboxhq/skills
      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`
      "Waiting for you to verify your email (Ctrl-C detaches; resume with: npx @agentinbox/cli setup email)
      "
    `);
  });

  it('keeps a setup that connects Telegram as it was', async () => {
    const output = await printed('telegramSetup');

    expect(output.exitCode).toBe(0);
    expect(output.stdout).toMatchInlineSnapshot(`
      "• Using your saved login.
      • Setting up your agent inbox...
      • Your agent inbox is atlas-x1@agentinbox.md.

      Open @atlas_bot in Telegram and tap Start:

        https://t.me/atlas_bot?start=abc

      • Telegram connected.
      • Saved config to /home/ada/.agentinbox/config.json.

      ✔ telegram connected. Agents on this machine can now run:
        npx @agentinbox/cli inbox send ask "Which environment should I target?"
        npx @agentinbox/cli inbox send approve "Deploy to production?"
        npx @agentinbox/cli inbox send "Build finished."
      • Teach your coding agent to use the inbox: npx skills add agentinboxhq/skills
      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`""`);
  });

  it('keeps a Telegram setup that times out waiting for /start as it was', async () => {
    const output = await printed('telegramSetupTimesOut');

    expect(output.exitCode).toBe(1);
    expect(output.stdout).toMatchInlineSnapshot(`
      "• Using your saved login.
      • Setting up your agent inbox...
      • Your agent inbox is atlas-x1@agentinbox.md.

      Open @atlas_bot in Telegram and tap Start:

        https://t.me/atlas_bot?start=abc

      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`
      "error: We didn't see your /start on @atlas_bot within 300s. Re-run \`npx @agentinbox/cli setup\` to continue.
      "
    `);
  });

  it('keeps a setup where Telegram was connected already as it was', async () => {
    const output = await printed('telegramConnectedAlready');

    expect(output.stdout).toMatchInlineSnapshot(`
      "• Using your saved login.
      • Setting up your agent inbox...
      • Your agent inbox is atlas-x1@agentinbox.md.
      • Telegram already connected.
      • Saved config to /home/ada/.agentinbox/config.json.

      ✔ telegram connected. Agents on this machine can now run:
        npx @agentinbox/cli inbox send ask "Which environment should I target?"
        npx @agentinbox/cli inbox send approve "Deploy to production?"
        npx @agentinbox/cli inbox send "Build finished."
      • Teach your coding agent to use the inbox: npx skills add agentinboxhq/skills
      "
    `);
  });

  it('keeps a login as it was', async () => {
    const output = await printed('login');

    expect(output.exitCode).toBe(0);
    expect(output.stdout).toMatchInlineSnapshot(`
      "
      Log in with your Agent Inbox account in your browser (opening it now):

        https://agentinbox.md/cli/login?code=BCDF-GHJK

      Approve there only if the page shows this code:  BCDF-GHJK


      ✔ Logged in as ada@example.com.
      • Saved to /home/ada/.agentinbox/config.json.
      Agents on this computer now reach you on your account's channels. None connected yet? Run: npx @agentinbox/cli setup
      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`
      "Waiting for you to approve BCDF-GHJK in your browser (Ctrl-C cancels)
      "
    `);
  });

  it('keeps a denied login as it was', async () => {
    const output = await printed('deniedLogin');

    expect(output.exitCode).toBe(1);
    expect(output.stdout).toMatchInlineSnapshot(`
      "
      Log in with your Agent Inbox account in your browser (opening it now):

        https://agentinbox.md/cli/login?code=BCDF-GHJK

      Approve there only if the page shows this code:  BCDF-GHJK

      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`
      "Waiting for you to approve BCDF-GHJK in your browser (Ctrl-C cancels)
      error: This login was denied in the browser, so nothing changed. Run \`npx @agentinbox/cli login\` again if that was a mistake.
      "
    `);
  });

  it('keeps a connection as it was', async () => {
    const output = await printed('connect');

    expect(output.exitCode).toBe(0);
    expect(output.stdout).toMatchInlineSnapshot(`
      "
      ✔ Connected to atlas.
      • Saved to /home/ada/.agentinbox/config.json.
      Check it works: npx @agentinbox/cli inbox list
      "
    `);
    expect(output.stderr).toMatchInlineSnapshot(`""`);
  });

  it('keeps a code that expired as it was', async () => {
    const output = await printed('expiredCode');

    expect(output.exitCode).toBe(1);
    expect(output.stdout).toMatchInlineSnapshot(`""`);
    expect(output.stderr).toMatchInlineSnapshot(`
      "error: This code expired. (410)
      "
    `);
  });
});

/** The words of a line, to look for: without its bullet or mark, colours, case and the punctuation it ends on. */
function words(line: string): string {
  return stripEscapes(line)
    .replace(/^\s*(•|✔|✕|→|error:|pending:)\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s:.…]+$/, '')
    .trim()
    .toLowerCase();
}

/** Every line printed without a terminal, as {@link words}. */
function linesOf(plain: { stdout: string; stderr: string }, stream: 'stdout' | 'stderr' = 'stdout'): string[] {
  return plain[stream].split('\n').map(words).filter(Boolean);
}

/** The text a person is left with on a terminal 100 columns wide, as {@link words}, all on one line. */
function leftOnScreen(output: { stdout: string }, { columns = 100, rows = 40 } = {}): string {
  const terminal = new VirtualTerminal(columns, rows);
  terminal.write(output.stdout);

  return words(terminal.text());
}

/** Everything that was ever on the screen, frame after frame, as {@link words}. */
function shownWhileRunning(output: { stdout: string }): string {
  return words(output.stdout);
}

describe('on a terminal', () => {
  beforeEach(() => {
    // The still faces: nothing waits for the mascot's eyes, so the runs are as quick as without a screen.
    process.env.AGENTINBOX_NO_ANIMATION = '1';
    process.env.AGENTINBOX_MASCOT_ASPECT = '1';
  });

  it('leaves everything a keyless setup printed on its screen, and shows the email wait while it lasts', async () => {
    const plain = await printed('keylessSetup');
    const shown = await printed('keylessSetup', 'terminal');
    const screen = leftOnScreen(shown);

    expect(shown.exitCode).toBe(0);
    for (const line of linesOf(plain)) {
      expect(screen).toContain(line);
    }
    expect(shownWhileRunning(shown)).toContain('waiting for you to verify your email');
    expect(shownWhileRunning(shown)).toContain('ctrl-c detaches; resume with: npx @agentinbox/cli setup email');
    expect(screen).toContain('fig. agent — happy');
    expect(shown.stderr).toBe('');
  });

  it('leaves what a Telegram setup printed, showing the link and its QR code while it waits for Start', async () => {
    const plain = await printed('telegramSetup');
    const shown = await printed('telegramSetup', 'terminal');
    const screen = leftOnScreen(shown);
    const link = 'https://t.me/atlas_bot?start=abc';

    for (const line of linesOf(plain).filter((line) => line !== link)) {
      expect(screen).toContain(line);
    }
    // The link and its QR code only help while the wait lasts.
    expect(shownWhileRunning(shown)).toContain(link);
    expect(shownWhileRunning(shown)).toContain('waiting for your /start on @atlas_bot');
    expect(shown.stdout).toContain('█');
    expect(screen).not.toContain(link);
    expect(screen).toContain('telegram connected. agents on this machine can now run');
  });

  it('falls asleep with the error as its last row when nobody taps Start in time, and still exits 1', async () => {
    const plain = await printed('telegramSetupTimesOut');
    const shown = await printed('telegramSetupTimesOut', 'terminal');
    const screen = leftOnScreen(shown);

    expect(shown.exitCode).toBe(1);
    expect(screen).toContain(linesOf(plain, 'stderr')[0]);
    expect(screen).toContain('fig. agent — asleep');
    // The last row of the list, right above the rule that closes it.
    expect(screen.endsWith(`✕ ${linesOf(plain, 'stderr')[0]}. ${'─'.repeat(64)}`)).toBe(true);
    expect(shown.stderr).toBe('');
  });

  it('leaves everything a login printed, the link and the code included', async () => {
    const plain = await printed('login');
    const shown = await printed('login', 'terminal');
    const screen = leftOnScreen(shown);

    expect(shown.exitCode).toBe(0);
    for (const line of linesOf(plain)) {
      expect(screen).toContain(line);
    }
    expect(shownWhileRunning(shown)).toContain('waiting for you to approve bcdf-ghjk in your browser');
    expect(screen).toContain('fig. agent — happy');
  });

  it('falls asleep when the login is denied, with the same words and exit code', async () => {
    const plain = await printed('deniedLogin');
    const shown = await printed('deniedLogin', 'terminal');

    expect(shown.exitCode).toBe(plain.exitCode);
    expect(leftOnScreen(shown)).toContain(linesOf(plain, 'stderr').at(-1));
    expect(leftOnScreen(shown)).toContain('fig. agent — asleep');
  });

  it("leaves everything a connection printed, under the agent's name", async () => {
    const plain = await printed('connect');
    const shown = await printed('connect', 'terminal');
    const screen = leftOnScreen(shown);

    for (const line of linesOf(plain)) {
      expect(screen).toContain(line);
    }
    expect(screen).toContain('agentinbox connect');
    expect(screen).toContain('fig. atlas — happy');
  });

  it('falls asleep when the code has expired, with the same words and exit code', async () => {
    const plain = await printed('expiredCode');
    const shown = await printed('expiredCode', 'terminal');

    expect(shown.exitCode).toBe(1);
    expect(leftOnScreen(shown)).toContain('this code expired. (410)');
    expect(leftOnScreen(shown)).toContain('fig. atlas — asleep');
    expect(plain.stderr).toContain('This code expired. (410)');
  });

  it('draws the mascot in braille, hides the cursor while it draws, and shows it again at the end', async () => {
    for (const scenario of ['connect', 'expiredCode'] as const) {
      const shown = await printed(scenario, 'terminal');

      expect(shown.stdout.startsWith('\x1b[?25l')).toBe(true);
      expect(shown.stdout.endsWith('\x1b[?25h')).toBe(true);
      expect(shown.stdout).toMatch(/[\u2801-\u28ff]/);
    }
  });

  it('asks before replacing a setup, below the screen, and keeps the answer on it', async () => {
    typed.push('y');
    loadConfig.mockReturnValue(accountConfig);
    const shown = await printed('connectOverSetup', 'terminal', { typing: true });
    const screen = leftOnScreen(shown);

    expect(shown.exitCode).toBe(0);
    expect(connectWithCode).toHaveBeenCalled();
    expect(screen).toContain('connecting atlas makes it act as atlas from now on. continue? [y/n] y');
    expect(screen).toContain('connected to atlas');
  });

  it('asks who you are during setup, below its screen, and keeps the answers on it', async () => {
    typed.push('Ada', 'Lovelace');
    const shown = await printed('keylessSetup', 'terminal', { typing: true });
    const screen = leftOnScreen(shown);
    const { setupRelay } = await import('../api/agent-inbox');

    expect(shown.exitCode).toBe(0);
    expect(vi.mocked(setupRelay)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ firstName: 'Ada', lastName: 'Lovelace' })
    );
    expect(screen).toContain('your first name: ada');
    expect(screen).toContain('your last name (optional): lovelace');
  });

  it('stops where the answer is no, as before', async () => {
    typed.push('n');
    const shown = await printed('connectOverSetup', 'terminal', { typing: true });

    expect(shown.exitCode).toBe(1);
    expect(connectWithCode).not.toHaveBeenCalled();
    expect(leftOnScreen(shown)).toContain('nothing changed. the code still works for the rest of its 10 minutes');
  });

  it('prints what it always printed where it is not for a person at a terminal', async () => {
    for (const [key, value] of [
      ['NO_COLOR', '1'],
      ['TERM', 'dumb'],
      ['CI', 'true'],
      ['FORCE_COLOR', '0'],
    ]) {
      const plain = await printed('telegramSetup');
      process.env[key] = value;
      const shown = await printed('telegramSetup', 'terminal');
      delete process.env[key];

      expect(shown).toEqual(plain);
    }
  });

  it('prints what it always printed where stderr goes elsewhere, or the terminal is narrower than 48 columns', async () => {
    const plain = await printed('login');

    expect(await printed('login', 'stdout')).toEqual(plain);
    // Stderr is a terminal there, so the wait has its spinner, as it always had.
    expect((await printed('login', 'terminal', { columns: 47 })).stdout).toBe(plain.stdout);
  });
});
