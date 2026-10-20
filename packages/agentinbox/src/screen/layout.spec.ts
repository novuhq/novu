import { describe, expect, it } from 'vitest';
import { drawMascot, mascotLines, toCells } from '../mascot/drawing';
import {
  fitScreen,
  heightOf,
  type LayoutOptions,
  type Look,
  layoutScreen,
  paintMascot,
  type ScreenView,
} from './layout';
import { stripEscapes, textWidth } from './terminal';

const DARK: Look = { colors: 'truecolor', theme: 'dark' };

const waiting: ScreenView = {
  command: 'login',
  handle: 'agent',
  emotion: 'thinking',
  subtitle: 'Log in with your Agent Inbox account in your browser (opening it now).',
  rows: [
    { step: '01', value: 'https://agentinbox.md/cli/login?code=BCDF-GHJK', whole: true },
    { step: '02', value: 'Approve there only if the page shows this code:  BCDF-GHJK' },
  ],
  status: { text: 'Waiting for you to approve BCDF-GHJK in your browser', hint: 'Ctrl-C cancels' },
};

function laidOut(view: ScreenView, options: Partial<LayoutOptions> = {}) {
  const lines = layoutScreen(view, { columns: 80, look: DARK, spinner: '⠋', ...options });

  return { lines, text: lines.map((line) => stripEscapes(line)) };
}

/** Where a line's text starts and ends, in columns. */
function span(line: string) {
  const start = line.length - line.trimStart().length;

  return { start, end: textWidth(line) };
}

describe('layoutScreen', () => {
  it('lays a column 64 wide out in the middle of 80 columns, between two rules', () => {
    const { text } = laidOut(waiting);
    const rules = text.filter((line) => line.includes('─'));

    expect(rules).toHaveLength(2);
    expect(span(rules[0])).toEqual({ start: 8, end: 72 });
    expect(text).toContain('         01  https://agentinbox.md/cli/login?code=BCDF-GHJK');
    expect(text).toContain('         02  Approve there only if the page shows this code:  BCDF-GHJK');
  });

  it('narrows the column to the terminal less 4 columns, at 60', () => {
    const { text } = laidOut(waiting, { columns: 60 });
    const rule = text.find((line) => line.includes('─')) ?? '';

    expect(span(rule)).toEqual({ start: 2, end: 58 });
    // The value that no longer fits wraps under itself.
    expect(text).toContain('   02  Approve there only if the page shows this code:');
    expect(text).toContain('       BCDF-GHJK');
  });

  it('centres the caption, the command and the subtitle', () => {
    const mascot = paintMascot(toCells(drawMascot(64, { blink: 0, joy: 0 }, { shimmer: 0 })), DARK, 80);
    const { text } = laidOut(waiting, { mascot });

    for (const line of ['fig. agent — thinking', 'agentinbox login', waiting.subtitle ?? '']) {
      const found = text.find((each) => each.trim() === line) ?? '';
      expect(Math.abs(span(found).start - (80 - span(found).end))).toBeLessThanOrEqual(1);
    }
    // The mascot is centred too: 32 columns in the middle of 80.
    expect(text.slice(1, 1 + 16).every((line) => line === '' || line.startsWith(' '.repeat(24)))).toBe(true);
  });

  it('wraps a subtitle wider than the terminal, centring each line', () => {
    const { text } = laidOut(waiting, { columns: 60 });

    expect(text).toContain('    Log in with your Agent Inbox account in your browser');
    expect(text).toContain(`${' '.repeat(21)}(opening it now).`);
  });

  it('puts the status hint at the right of the column, or on a line of its own where both do not fit', () => {
    const short = laidOut({ ...waiting, status: { text: 'Checking the code', hint: 'Ctrl-C cancels' } }).text;
    expect(short.at(-1)).toBe(`         ⠋  Checking the code${' '.repeat(29)}Ctrl-C cancels`);
    expect(span(short.at(-1) ?? '').end).toBe(72);

    const long = laidOut(waiting).text;
    expect(long.slice(-2)).toEqual([
      '         ⠋  Waiting for you to approve BCDF-GHJK in your browser',
      `${' '.repeat(58)}Ctrl-C cancels`,
    ]);
  });

  it('never makes a line wider than the terminal, but for a link kept whole', () => {
    const long = 'word '.repeat(40);
    const view: ScreenView = {
      ...waiting,
      subtitle: long,
      rows: [{ mark: 'done', label: 'Account', value: long, note: 'and a note' }],
      status: { text: long, hint: long },
    };

    for (const columns of [48, 60, 80, 120]) {
      for (const line of laidOut(view, { columns }).lines) {
        expect(textWidth(line)).toBeLessThan(columns);
      }
    }
    const link = `https://example.com/${'x'.repeat(100)}`;
    expect(laidOut({ ...waiting, rows: [{ mark: 'next', value: link, whole: true }] }).text).toContain(
      `         →   ${link}`
    );
  });

  it('marks rows done, failed and next, and lines their values up after the longest label', () => {
    const { text } = laidOut({
      ...waiting,
      rows: [
        { mark: 'done', label: 'Account', value: 'ada@example.com' },
        { mark: 'failed', label: 'Code', value: 'BCDF-GHJK', note: 'expired' },
        { mark: 'next', value: 'npx @agentinbox/cli setup' },
        { mark: 'info', value: 'Using your saved login.' },
      ],
    });

    expect(text).toContain('         ✔   Account  ada@example.com');
    expect(text).toContain('         ✕   Code     BCDF-GHJK  expired');
    expect(text).toContain('         →            npx @agentinbox/cli setup');
    expect(text).toContain('         •            Using your saved login.');
  });

  it('writes colours in 24-bit, or as the closest of 256', () => {
    const truecolor = laidOut(waiting).lines.join('\n');
    const ansi256 = laidOut(waiting, { look: { colors: 'ansi256', theme: 'dark' } }).lines.join('\n');

    // The accent of the spinner, #ff5c30.
    expect(truecolor).toContain('\x1b[38;2;255;92;48m⠋');
    expect(truecolor).not.toMatch(/38;5;/);
    expect(ansi256).toContain('\x1b[38;5;203m⠋');
    expect(ansi256).not.toMatch(/38;2;/);
  });

  it("keeps the terminal's own colour for the main text on a light background", () => {
    const light = laidOut(waiting, { look: { colors: 'truecolor', theme: 'light' } }).lines.join('\n');

    expect(light).toContain('\x1b[1magentinbox\x1b[22m');
    expect(light).not.toContain('235;226;214');
    // The light accent, #e04a1c.
    expect(light).toContain('\x1b[38;2;224;74;28m⠋');
  });

  it('folds the oldest rows away when asked, and ends with a blank line when final', () => {
    const rows = ['one', 'two', 'three', 'four'].map((value) => ({ mark: 'done' as const, value }));
    const { text } = laidOut({ ...waiting, rows }, { hiddenRows: 2, final: true });

    expect(text).toContain('         ⋯');
    expect(text.join('\n')).not.toContain('two');
    expect(text.join('\n')).toContain('four');
    expect(text.at(-1)).toBe('');
  });
});

describe('fitScreen', () => {
  const fit = (rows: number, columns = 80, aspect = 1, view = waiting) => fitScreen(view, { columns, rows, aspect });
  /** The screen's height without its mascot, at 80 columns. */
  const bare = heightOf(laidOut(waiting).lines, 80);

  it('takes the largest mascot whose screen fits the terminal, leaving the line for the cursor', () => {
    expect(fit(60)).toEqual({ mascotWidth: 80, compact: false, hiddenRows: 0 });
    // The mascot at 80 dots takes 20 lines and its caption 2.
    expect(fit(bare + 20 + 2 + 1)).toEqual({ mascotWidth: 80, compact: false, hiddenRows: 0 });
    // One line short, it closes up the blank lines around the title before it takes a smaller mascot.
    expect(fit(bare + 20 + 2)).toEqual({ mascotWidth: 80, compact: true, hiddenRows: 0 });
    expect(fit(bare + 16 + 2 + 1)).toEqual({ mascotWidth: 64, compact: false, hiddenRows: 0 });
    expect(fit(bare + 12 + 2 + 1)).toEqual({ mascotWidth: 48, compact: false, hiddenRows: 0 });
  });

  it('takes the medium mascot on a 24-line terminal, closing up the blank lines', () => {
    expect(fit(24)).toEqual({ mascotWidth: 48, compact: true, hiddenRows: 0 });
  });

  it('drops the mascot where even the medium one does not fit, and keeps the rest', () => {
    expect(fit(bare + 1)).toEqual({ compact: false, hiddenRows: 0 });
    expect(fit(bare)).toEqual({ compact: true, hiddenRows: 0 });
  });

  it('counts the mascot taller on a terminal with taller characters', () => {
    expect(mascotLines(80, 1.18)).toBe(17);
    expect(fit(bare + 17 + 2 + 1, 80, 1.18)).toEqual({ mascotWidth: 80, compact: false, hiddenRows: 0 });
  });

  it('keeps the mascot narrower than the terminal', () => {
    expect(fit(60, 50)?.mascotWidth).toBe(80);
    expect(fit(60, 41)?.mascotWidth).toBe(64);
  });

  it('folds the oldest rows away before it gives up', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ mark: 'done' as const, value: `step ${index}` }));
    const tall = { ...waiting, rows };

    expect(fit(20, 80, 1, tall)?.hiddenRows).toBeGreaterThan(0);
    expect(fit(5, 80, 1, tall)).toBeNull();
  });
});
