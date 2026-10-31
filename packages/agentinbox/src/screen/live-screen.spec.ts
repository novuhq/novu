import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadOptions } from '../cli-io';
import { type ScreenHost, startLiveScreen } from './live-screen';
import { setOpenedScreen } from './opened';
import { BEGIN_FRAME, HIDE_CURSOR, SHOW_CURSOR } from './painter';
import type { AskNote } from './screen';
import { VirtualTerminal } from './virtual-terminal.fixture';

const INVERSE = '\x1b[7m';

/** Lets the screen draw what changed, and anything queued after that. */
const drawnSoon = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A terminal and a clock for the screen to run on. Frames come only when the test calls `tick`. An answer
 * read on the screen comes from `type` and `enter`, as keys do; `answers` are for one asked on a plain
 * terminal, written as it echoes them.
 */
function fakeHost({ columns = 80, rows = 40, animate = false, theme = 'dark' as 'dark' | 'light' } = {}) {
  const terminal = new VirtualTerminal(columns, rows);
  const writes: string[] = [];
  const answers: string[] = [];
  const exits: Array<() => void> = [];
  let reading: { answer: string; onChange: ReadOptions['onChange']; finish: (answer: string) => void } | undefined;
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
    read: ({ initial = '', onChange }) =>
      new Promise((finish) => {
        reading = { answer: initial, onChange, finish };
      }),
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
    /** Keys typed at the end of the answer being read. */
    type: (text: string) => {
      if (reading) {
        reading.answer += text;
        reading.onChange(reading.answer, reading.answer.length);
      }
    },
    /** Enter, on the answer being read. */
    enter: () => {
      reading?.finish(reading.answer);
      reading = undefined;
    },
    /** Whether an answer is being read on the screen. */
    reading: () => reading !== undefined,
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

  it('asks at the end of the list, in its column, and keeps the answer in the same place', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    screen.add({ mark: 'done', value: 'Creating a keyless inbox' });
    await drawnSoon();

    const answer = screen.ask('Your first name: ');
    await drawnSoon();
    fake.type('Ada');
    await drawnSoon();

    const lines = fake.shown();
    const done = lines.findIndex((line) => line.includes('Creating a keyless inbox'));
    expect(lines[done]).toBe('         ✔   Creating a keyless inbox');
    expect(lines[done + 1]).toBe('         →   Your first name: Ada');
    expect(lines[done + 2]).toMatch(/^ {8}─+$/);

    fake.enter();
    await expect(answer).resolves.toBe('Ada');
    await drawnSoon();

    expect(fake.shown()[done + 1]).toBe('         ✔   Your first name: Ada');
    expect(fake.shown()[done + 2]).toMatch(/^ {8}─+$/);
  });

  it('keeps the mascot moving while a question waits', async () => {
    const fake = fakeHost({ animate: true });
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    const answer = screen.ask('Your first name: ');
    await drawnSoon();
    const before = fake.writes.length;
    fake.tick(100);
    fake.tick(100);
    const drawn = fake.writes.slice(before).join('');

    expect(fake.interval()).toBeGreaterThan(0);
    expect(drawn).toMatch(/[\u2800-\u28ff]/u);
    expect(drawn).not.toContain('Your first name');

    fake.enter();
    await answer;
  });

  it('keeps the terminal cursor hidden and blinks a caret of its own, solid while typing', async () => {
    const fake = fakeHost({ animate: true });
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();
    const before = fake.writes.length;

    const answer = screen.ask('Your first name: ');
    await drawnSoon();
    expect(fake.writes.slice(before).join('')).not.toContain(SHOW_CURSOR);
    expect(fake.writes.slice(before).join('')).toContain(INVERSE);

    const blinked = fake.writes.length;
    fake.tick(600);
    expect(fake.writes.slice(blinked).join('')).not.toContain(INVERSE);

    fake.type('A');
    await drawnSoon();
    expect(fake.writes.at(-1)).toContain(INVERSE);

    fake.enter();
    await answer;
  });

  it('starts from what is on offer, and shows what follows it without making it part of the answer', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    const answer = screen.ask("Your agent's address: ", {
      initial: 'atlas',
      suffix: '@agentinbox.md',
      note: { text: '✓ atlas is available', tone: 'success' },
      check: async () => undefined,
    });
    await drawnSoon();

    expect(fake.shown().join('\n')).toContain("→   Your agent's address: atlas@agentinbox.md");
    expect(fake.shown().join('\n')).toContain('✓ atlas is available');

    fake.enter();
    await expect(answer).resolves.toBe('atlas');
  });

  it('shows the answer as it is meant, without changing what was typed', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    const answer = screen.ask('Address: ', { display: (typed) => typed.toLowerCase().replaceAll(' ', '-') });
    fake.type('Acme Bot');
    await drawnSoon();
    expect(fake.shown().join('\n')).toContain('Address: acme-bot');

    fake.enter();
    await expect(answer).resolves.toBe('Acme Bot');
  });

  it('checks the answer once the typing stops, and drops what comes back for an answer changed since', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();
    const pending: Array<(note: AskNote) => void> = [];
    const check = vi.fn(() => new Promise<AskNote>((resolve) => pending.push(resolve)));

    const answer = screen.ask('Address: ', { check });
    await drawnSoon();

    fake.type('at');
    await drawnSoon();
    expect(fake.shown().join('\n')).toContain('checking…');
    expect(check).not.toHaveBeenCalled();

    fake.type('l');
    await vi.advanceTimersByTimeAsync(250);
    expect(check).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledWith('atl');

    fake.type('as');
    pending[0]({ text: 'atl is taken', tone: 'accent' });
    await drawnSoon();
    expect(fake.shown().join('\n')).not.toContain('atl is taken');

    await vi.advanceTimersByTimeAsync(250);
    pending[1]({ text: '✓ atlas is available', tone: 'success' });
    await drawnSoon();
    await drawnSoon();
    expect(fake.shown().join('\n')).toContain('✓ atlas is available');

    fake.enter();
    await answer;
    vi.useRealTimers();
  });

  it('says nothing about an answer it could not check', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    const answer = screen.ask('Address: ', { check: () => Promise.reject(new Error('network down')) });
    fake.type('atlas');
    await vi.advanceTimersByTimeAsync(250);
    await drawnSoon();
    await drawnSoon();

    expect(fake.shown().join('\n')).not.toContain('checking…');
    expect(fake.shown().join('\n')).not.toContain('network down');

    fake.enter();
    await answer;
    vi.useRealTimers();
  });

  it('shows a menu with the question it belongs to, in the list, until that is answered', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    screen.print('\nAlso connect a chat channel? Press Enter to skip.\n  1. Telegram\n  2. Slack\n\n');
    const answer = screen.ask('Channel [1, 2, or Enter]: ');
    await drawnSoon();

    const lines = fake.shown();
    const heading = lines.findIndex((line) => line.includes('Also connect a chat channel?'));
    expect(lines[heading]).toBe('             Also connect a chat channel? Press Enter to skip.');
    expect(lines[heading + 1]).toBe('               1. Telegram');
    expect(lines[heading + 2]).toBe('               2. Slack');
    expect(lines[heading + 3]).toContain('→   Channel [1, 2, or Enter]:');

    fake.enter();
    await answer;
    await drawnSoon();
    await drawnSoon();

    expect(fake.shown().join('\n')).not.toContain('Telegram');
  });

  it('keeps a menu up for a question asked again at once, with what was wrong said once', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();
    const retry = 'Pick 1 for Telegram, 2 for Slack, or press Enter to skip.\n';

    screen.print('  1. Telegram\n  2. Slack\n');
    for (const wrong of ['9', '8']) {
      const answer = screen.ask('Channel: ', { remember: () => undefined });
      fake.type(wrong);
      fake.enter();
      await answer;
      screen.print(retry);
    }
    void screen.ask('Channel: ');
    await drawnSoon();
    await drawnSoon();

    const text = fake.shown().join('\n');
    expect(text).toContain('1. Telegram');
    expect(text.match(/Pick 1 for Telegram/g)).toHaveLength(1);
  });

  it('leaves a menu behind for the next question, keeping what was written for that one', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup telegram' }, fake.host);
    await drawnSoon();

    screen.print('How do you want to connect the Telegram bot?\n  1. Paste the bot token here\n');
    const choice = screen.ask('Choice [1-2]: ');
    fake.type('1');
    fake.enter();
    await choice;
    screen.print('Create a Telegram bot:\n');
    void screen.ask('Telegram bot token: ', { secret: true });
    await drawnSoon();
    await drawnSoon();

    const text = fake.shown().join('\n');
    expect(text).not.toContain('How do you want to connect');
    expect(text).toContain('Create a Telegram bot:');
    expect(text).toContain('✔   Choice [1-2]: 1');
  });

  it('asks a question of several lines on the screen, keeping only its last in the list', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'connect' }, fake.host);
    await drawnSoon();

    const answer = screen.ask('Connecting atlas replaces this setup.\nContinue? [y/N] ');
    await drawnSoon();
    expect(fake.shown().join('\n')).toContain('Connecting atlas replaces this setup.');

    fake.type('y');
    fake.enter();
    await answer;
    await drawnSoon();
    await drawnSoon();

    expect(fake.shown().join('\n')).toContain('✔   Continue? [y/N] y');
    expect(fake.shown().join('\n')).not.toContain('Connecting atlas replaces');
  });

  it('asks on a plain terminal where the screen has no room for the question', async () => {
    const fake = fakeHost({ rows: 5 });
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    fake.answers.push('Ada');

    await expect(screen.ask('Your first name: ')).resolves.toBe('Ada');

    expect(fake.reading()).toBe(false);
    expect(fake.terminal.text()).toContain('Your first name: Ada');
  });

  it('asks on a plain terminal where nothing is drawn in place, offering in brackets', async () => {
    const fake = fakeHost({ rows: 0 });
    const screen = startLiveScreen({ command: 'setup' }, fake.host);

    await expect(screen.ask("Your agent's address: ", { initial: 'atlas', suffix: '@agentinbox.md' })).resolves.toBe(
      'atlas'
    );

    expect(fake.terminal.text()).toContain("Your agent's address [atlas@agentinbox.md]:");
  });

  it('lists what is written behind its back while a question waits, instead of letting it break the screen', async () => {
    const fake = fakeHost();
    const screen = startLiveScreen({ command: 'setup' }, fake.host);
    await drawnSoon();

    const answer = screen.ask('Your first name: ');
    await drawnSoon();
    fake.out.write('a warning from a dependency\n');
    await drawnSoon();

    const lines = fake.shown();
    const warned = lines.findIndex((line) => line.includes('a warning from a dependency'));
    expect(lines[warned].trim()).toBe('a warning from a dependency');
    expect(lines[warned + 1]).toContain('→   Your first name:');

    fake.enter();
    await answer;
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
    await drawnSoon();
    const token = 'Telegram bot token: ';

    for (const typed of ['123456:ABC-secret', 'not a token']) {
      const answer = screen.ask(token, { secret: true });
      fake.type(typed);
      await drawnSoon();
      fake.enter();
      await answer;
      screen.print('That does not look like a bot token (expected 123456:ABC-...).\n');
    }
    const last = screen.ask(token, { secret: true });
    await drawnSoon();

    expect(fake.shown().join('\n')).toContain('That does not look like a bot token');
    expect(fake.shown().join('\n')).not.toContain('✔   Telegram bot token');

    fake.type('real');
    await drawnSoon();
    expect(fake.shown().join('\n')).toContain('→   Telegram bot token: ••••');
    fake.enter();
    await last;
    screen.say('Creating the Slack app...');
    await drawnSoon();

    const text = fake.shown().join('\n');
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
