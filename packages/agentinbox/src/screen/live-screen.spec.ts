import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ScreenHost, startLiveScreen } from './live-screen';
import { setOpenedScreen } from './opened';
import { BEGIN_FRAME, HIDE_CURSOR, SHOW_CURSOR } from './painter';
import { VirtualTerminal } from './virtual-terminal.fixture';

/** Lets the screen draw what changed, and anything queued after that. */
const drawnSoon = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A terminal and a clock for the screen to run on. Frames come only when the test calls `tick`; the
 * answers to questions come from `answers`, written as a terminal echoes them.
 */
function fakeHost({ columns = 80, rows = 40, animate = false, theme = 'dark' as 'dark' | 'light' } = {}) {
  const terminal = new VirtualTerminal(columns, rows);
  const writes: string[] = [];
  const answers: string[] = [];
  const exits: Array<() => void> = [];
  let frame: (() => void) | undefined;
  let interval = 0;
  let now = 0;

  const out = {
    isTTY: true,
    columns,
    rows,
    write: (chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      terminal.write(String(chunk));

      return true;
    },
    on: vi.fn(),
    off: vi.fn(),
  };
  const err = { isTTY: true, columns, rows, write: vi.fn((_chunk: string | Uint8Array) => true) };
  const host: ScreenHost = {
    out,
    err,
    colors: 'truecolor',
    aspect: 1,
    theme,
    animate,
    now: () => now,
    // Blinks and smiles wait as long as they can.
    random: () => 0.99,
    every: (ms, callback) => {
      frame = callback;
      interval = ms;

      return {
        stop: () => {
          frame = undefined;
        },
        hold: () => undefined,
      };
    },
    later: (task) => setImmediate(task),
    ask: async (question, secret) => {
      const answer = answers.shift() ?? '';
      out.write(`${question}${secret ? '' : answer}\n`);

      return answer;
    },
    beforeExit: (listener) => {
      exits.push(listener);

      return () => exits.splice(exits.indexOf(listener), 1);
    },
  };

  return {
    host,
    out,
    err,
    terminal,
    writes,
    answers,
    exits,
    interval: () => interval,
    /** Moves the clock on and draws a frame, as the timer would. */
    tick: (ms = 1000 / 30) => {
      now += ms;
      frame?.();
    },
    /** The text on screen, without the blank lines. */
    shown: () => terminal.screen().filter(Boolean),
    /** The lines on screen, trimmed, for what is centred. */
    centred: () => terminal.screen().map((line) => line.trim()),
  };
}

afterEach(() => {
  setOpenedScreen(null);
});

describe('startLiveScreen', () => {
  it('draws the command with the cursor hidden, and leaves it, cursor shown, on done', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'login' }, fake.host);
    await drawnSoon();

    expect(fake.writes[0]).toBe(HIDE_CURSOR);
    expect(fake.centred()).toContain('fig. agent — awake');
    expect(fake.centred()).toContain('agentinbox login');

    await screen.done('happy');

    expect(fake.writes.at(-1)?.endsWith(SHOW_CURSOR)).toBe(true);
    expect(fake.centred()).toContain('fig. agent — happy');
  });

  it('draws 30 frames a second, rewriting only the lines that changed', async () => {
    const fake = fakeHost({ animate: true });
    const screen = startLiveScreen({ command: 'connect', handle: 'atlas' }, fake.host);
    screen.wait({ status: { text: 'Connecting to atlas…' } });
    await drawnSoon();

    expect(fake.interval()).toBeCloseTo(1000 / 30);
    const before = fake.writes.length;
    fake.tick(80);
    const frame = fake.writes.slice(before).join('');

    // Only the shimmer of some of the mascot's lines and the spinner changed: far less than the whole screen.
    expect(frame.startsWith(BEGIN_FRAME)).toBe(true);
    expect(frame).toContain('⠙');
    expect(frame.match(/\x1b\[2K/g)?.length ?? 0).toBeLessThan(fake.terminal.screen().filter(Boolean).length);
    expect(frame).toContain('\x1b[1E');
  });

  it('writes nothing when nothing changed', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'login' }, fake.host);
    screen.subtitle('Log in.');
    await drawnSoon();
    const before = fake.writes.length;

    screen.subtitle('Log in.');
    await drawnSoon();

    expect(fake.writes.slice(before).join('')).toBe('');
  });

  it('shows what is under way on the status line, and lists it as done once the next thing happens', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    screen.say('Setting up your agent inbox...');
    await drawnSoon();

    expect(fake.shown()).toContain('         •  Setting up your agent inbox…');
    expect(fake.centred()).toContain('fig. agent — thinking');

    screen.say('Your agent inbox is atlas@agentinbox.md.');
    await drawnSoon();

    expect(fake.shown()).toContain('         ✔   Setting up your agent inbox');
    expect(fake.shown()).toContain('         •   Your agent inbox is atlas@agentinbox.md.');
    expect(fake.centred()).toContain('fig. agent — awake');
  });

  it('shows a wait with its link and QR code, and keeps what it said once it is over', async () => {
    const fake = fakeHost({ rows: 60 });
    const screen = startLiveScreen({ command: 'setup telegram' }, fake.host);
    const stop = screen.wait({
      subtitle: 'Open @atlas_bot in Telegram and tap Start (scan the QR or use the link).',
      figure: ['█▀▀█', '█▄▄█'],
      rows: [{ mark: 'next', value: 'https://t.me/atlas_bot?start=abc', whole: true }],
      status: { text: 'Waiting for your /start on @atlas_bot' },
      said: 'Open @atlas_bot in Telegram and tap Start.',
    });
    await drawnSoon();

    expect(fake.shown()).toContain('         →   https://t.me/atlas_bot?start=abc');
    expect(fake.shown()).toContain('                                      █▀▀█');
    expect(fake.shown().at(-1)).toBe('         •  Waiting for your /start on @atlas_bot');

    stop();
    await drawnSoon();

    expect(fake.shown().join('\n')).not.toContain('t.me');
    expect(fake.shown()).toContain('         •   Open @atlas_bot in Telegram and tap Start.');
  });

  it('asks below the screen, clears the question once answered, and keeps the answer in the list', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    fake.answers.push('Ada');
    await drawnSoon();

    const answer = screen.ask('Your first name: ');
    // The question is written below the screen, with a blank line between.
    expect(fake.shown().slice(-1)).toEqual(['Your first name: Ada']);
    await expect(answer).resolves.toBe('Ada');
    await drawnSoon();

    expect(fake.centred()).not.toContain('Your first name: Ada');
    expect(fake.shown().at(-2)).toBe('         ✔   Your first name: Ada');
    expect(fake.terminal.screen().filter(Boolean).at(-1)).toMatch(/^ {8}─+$/);
  });

  it('shows the cursor while a question waits for its answer, and hides it again after', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    fake.answers.push('Ada');
    await drawnSoon();
    const before = fake.writes.length;

    await screen.ask('Your first name: ');
    const asked = fake.writes.slice(before).join('');
    expect(asked.indexOf(SHOW_CURSOR)).toBeGreaterThan(-1);
    expect(asked.indexOf(SHOW_CURSOR)).toBeLessThan(asked.indexOf('Your first name: '));

    await drawnSoon();
    await drawnSoon();
    const after = fake.writes.slice(before).join('');
    expect(after.lastIndexOf(HIDE_CURSOR)).toBeGreaterThan(after.indexOf('Your first name: '));
  });

  it('prints a wait that no longer fits in place, with its link and code, once it stops drawing in place', async () => {
    const fake = fakeHost({ rows: 24 });
    const screen = startLiveScreen({ command: 'setup telegram' }, fake.host);
    await drawnSoon();

    screen.wait({
      figure: Array.from({ length: 30 }, () => '█▀▀█'),
      rows: [{ mark: 'next', value: 'https://t.me/atlas_bot?start=abc', whole: true }],
      status: { text: 'Waiting for your /start on @atlas_bot' },
    });
    await drawnSoon();

    const text = fake.writes.join('');
    expect(text).toContain('https://t.me/atlas_bot?start=abc');
    expect(text).toContain('Waiting for your /start on @atlas_bot');
    expect(text.lastIndexOf(SHOW_CURSOR)).toBeGreaterThan(text.lastIndexOf(HIDE_CURSOR));
  });

  it('keeps a secret answer as dots, and only the last answer to a question asked again', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    fake.answers.push('123456:ABC-secret', 'not a token', 'real');
    await drawnSoon();

    await screen.ask('Telegram bot token: ', { secret: true });
    screen.print('That does not look like a bot token (expected 123456:ABC-...).\n');
    await screen.ask('Telegram bot token: ', { secret: true });
    await screen.ask('Telegram bot token: ', { secret: true });
    screen.say('Creating the Slack app...');
    await drawnSoon();

    const text = fake.shown().join('\n');
    expect(text).not.toContain('123456:ABC-secret');
    expect(text).not.toContain('That does not look like');
    expect(text.match(/Telegram bot token: ••••••••/g)).toHaveLength(1);
    expect(fake.writes.join('')).not.toContain('123456:ABC-secret');
  });

  it('lists text written behind its back, on stdout or stderr, instead of letting it break the screen', async () => {
    const fake = fakeHost();
    startLiveScreen({ command: 'login' }, fake.host);
    await drawnSoon();

    fake.out.write('• stray line\n');
    fake.err.write('(node) a warning\n');
    await drawnSoon();

    expect(fake.shown()).toContain('             • stray line');
    expect(fake.shown()).toContain('             (node) a warning');
  });

  it('ends a failure with the message as its last row, the mascot asleep, and the cursor shown', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'connect', handle: 'atlas' }, fake.host);
    screen.say('Connecting...');
    await drawnSoon();

    await screen.fail('This code expired. (410)');

    expect(fake.shown()).toContain('         •   Connecting');
    expect(fake.shown()).toContain('         ✕   This code expired. (410)');
    expect(fake.centred()).toContain('fig. atlas — asleep');
    expect(fake.writes.at(-1)?.endsWith(SHOW_CURSOR)).toBe(true);
  });

  it('marks what is still pending with an arrow instead of a cross', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup slack' }, fake.host);

    await screen.fail('The Slack setup link expired before it was completed.', { pending: true });

    expect(fake.shown()).toContain('         →   The Slack setup link expired before it was completed.');
  });

  it('waits for the mascot to finish smiling before it leaves the screen', async () => {
    const fake = fakeHost({ animate: true });
    const screen = startLiveScreen({ command: 'login' }, fake.host);
    await drawnSoon();

    let left = false;
    const done = screen.done('happy').then(() => {
      left = true;
    });
    // 400ms of frames: the smile takes 420.
    for (let frame = 0; frame < 12; frame += 1) {
      fake.tick();
    }
    await drawnSoon();
    expect(left).toBe(false);

    fake.tick(50);
    await done;
    expect(left).toBe(true);
  });

  it('draws nothing in place where the terminal does not say how tall it is, and prints the screen at waits and at the end', async () => {
    const fake = fakeHost({ rows: 0 });
    const screen = startLiveScreen({ command: 'login' }, fake.host);
    await drawnSoon();
    expect(fake.writes).toEqual([]);

    const stop = screen.wait({ status: { text: 'Waiting for you to approve BCDF-GHJK' } });
    stop();
    screen.add({ mark: 'done', value: 'Logged in as ada@example.com.' });
    await screen.done('happy');

    const text = fake.writes.join('');
    expect(text).not.toContain(HIDE_CURSOR);
    expect(text).not.toMatch(/\x1b\[\d*F/);
    expect(text.match(/agentinbox/g)).toHaveLength(2);
    expect(text).toContain('Waiting for you to approve BCDF-GHJK');
    expect(text).toContain('fig. agent — happy');
  });

  it('puts the terminal right if the process ends without the command ending the screen', async () => {
    const fake = fakeHost();
    startLiveScreen({ command: 'login' }, fake.host);
    await drawnSoon();
    fake.err.write('Error: boom\n');

    for (const exit of [...fake.exits]) {
      exit();
    }

    expect(fake.shown()).toContain('             Error: boom');
    expect(fake.writes.at(-1)?.endsWith(SHOW_CURSOR)).toBe(true);
  });

  it('cuts the eyes out of the mascot on a light background, with no cream at all', async () => {
    const fake = fakeHost({ theme: 'light' });
    const screen = startLiveScreen({ command: 'login' }, fake.host);
    await screen.done('happy');

    const text = fake.writes.join('');
    expect(text).toMatch(/[⠁-⣿]/);
    expect(text).not.toContain('238;229;216');
  });
});
