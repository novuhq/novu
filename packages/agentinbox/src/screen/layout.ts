import { dotColor, MASCOT_WIDTHS, type MascotCell, mascotLines, type Rgb, type Theme } from '../mascot/drawing';
import type { Emotion } from '../mascot/life';
import { type ColorMode, CSI, foreground, rowsOf, textWidth } from './terminal';
import { wrapStyled } from './wrap';

/**
 * The shared terminal layout of a command, worked out as lines of text. It only lays out: drawing the lines
 * on the terminal is up to whoever holds them.
 *
 *                     [the mascot, centred]
 *                     fig. atlas — thinking
 *
 *                       agentinbox login
 *          Log in with your Agent Inbox account in your browser.
 *
 *     ────────────────────────────────────────────────────────────
 *      01  https://agentinbox.md/cli/login?code=BCDF-GHJK
 *      02  Approve there only if the page shows this code:  BCDF-GHJK
 *     ────────────────────────────────────────────────────────────
 *      ⠹  Waiting for you to approve BCDF-GHJK          Ctrl-C cancels
 */

/** ✔ done, ✕ failed, → what to do next, • said in passing. */
export type RowMark = 'done' | 'failed' | 'next' | 'info';

/** A line in the screen's list: a mark or a step number, a short label, and what it says. */
export interface ScreenRow {
  mark?: RowMark;
  /** Shown, muted, where there is no mark: `01`, `02`... */
  step?: string;
  label?: string;
  value: string;
  /** Muted words after the value, such as what a command does. */
  note?: string;
  /**
   * Keeps the value on one line even where it is wider than the column, for the terminal to wrap: a link has
   * to stay whole to be clicked or copied.
   */
  whole?: boolean;
}

/** What is under way: a spinner and what it waits for, and a hint at the right, such as how to stop. */
export interface ScreenStatus {
  text: string;
  hint?: string;
}

/** Everything the screen shows. */
export interface ScreenView {
  /** The command after `agentinbox`, as typed: `login`, `setup telegram`. */
  command: string;
  /** The agent's handle for the caption, `agent` where it isn't known. */
  handle: string;
  emotion: Emotion;
  subtitle?: string;
  rows: readonly ScreenRow[];
  /** Lines drawn as they are, centred under the rows, such as a QR code. */
  figure?: readonly string[];
  status?: ScreenStatus;
}

/** How the screen is coloured: in which colours the terminal takes, and for which background. */
export interface Look {
  colors: ColorMode;
  theme: Theme;
}

export interface LayoutOptions {
  columns: number;
  look: Look;
  /** The mascot's lines, already centred (see {@link paintMascot}); none leaves it and its caption out. */
  mascot?: readonly string[];
  /** The spinner's character on the status line right now. */
  spinner: string;
  /** Leaves out the blank lines around the title, to fit a shorter terminal. */
  compact?: boolean;
  /** Leaves out this many rows from the top of the list, for a muted `⋯` in their place. */
  hiddenRows?: number;
  /** Ends with a blank line, as the screen is left once the command is done. */
  final?: boolean;
  /** Ends with a blank line, to keep a question written below apart from it. */
  gap?: boolean;
}

export type Tone = 'foreground' | 'default' | 'secondary' | 'muted' | 'rule' | 'accent' | 'success';

/**
 * The dashboard's colours, for a dark background and for a light one. On a light one the main text keeps the
 * terminal's own colour (`null`), which reads on any of them.
 */
export const TONES: Record<Theme, Record<Tone, Rgb | null>> = {
  dark: {
    foreground: [0xeb, 0xe2, 0xd6],
    default: [0xc4, 0xbc, 0xb0],
    secondary: [0x8f, 0x88, 0x7d],
    muted: [0x5c, 0x57, 0x4f],
    rule: [0x2e, 0x2b, 0x27],
    accent: [0xff, 0x5c, 0x30],
    success: [0x1f, 0xc1, 0x6b],
  },
  light: {
    foreground: null,
    default: [0x3d, 0x38, 0x33],
    secondary: [0x6b, 0x64, 0x5a],
    muted: [0x9a, 0x93, 0x89],
    rule: [0xdd, 0xd7, 0xce],
    accent: [0xe0, 0x4a, 0x1c],
    success: [0x15, 0x8f, 0x4f],
  },
};

/** Any look does to measure the screen: colours take no room. */
const MEASURING: Look = { colors: 'ansi256', theme: 'dark' };

/** The widest the column of rows gets. */
export const MAX_COLUMN = 64;

const MARKS: Record<RowMark, { char: string; tone: Tone }> = {
  done: { char: '✔', tone: 'success' },
  failed: { char: '✕', tone: 'accent' },
  next: { char: '→', tone: 'accent' },
  info: { char: '•', tone: 'muted' },
};

const BOLD = `${CSI}1m`;
const NOT_BOLD = `${CSI}22m`;
const DEFAULT_COLOR = `${CSI}39m`;

/** `text` in `tone`. Wherever `text` turns its own colour off, `tone` comes back. */
export function paint(text: string, tone: Tone, { colors, theme }: Look): string {
  const rgb = TONES[theme][tone];
  if (!rgb) {
    return text;
  }

  const color = foreground(rgb, colors);

  return `${color}${text.replace(/\x1b\[(?:0|39)?m/g, (reset) => `${reset}${color}`)}${DEFAULT_COLOR}`;
}

/** The mascot's cells as lines in their colours, centred on a terminal `columns` wide. */
export function paintMascot(
  cells: ReadonlyArray<ReadonlyArray<MascotCell | null>>,
  { colors, theme }: Look,
  columns: number
): string[] {
  const indent = ' '.repeat(Math.max(0, Math.floor((columns - (cells[0]?.length ?? 0)) / 2)));

  return cells.map((line) => {
    const end = line.reduce((last, cell, index) => (cell ? index + 1 : last), 0);
    let text = '';
    let level = 0;

    for (const cell of line.slice(0, end)) {
      if (!cell) {
        text += ' ';
        continue;
      }
      if (cell.level !== level) {
        text += foreground(dotColor(cell.level, theme), colors);
        level = cell.level;
      }
      text += cell.char;
    }

    return end > 0 ? `${indent}${text}${DEFAULT_COLOR}` : '';
  });
}

/** The screen as lines, none wider than the terminal except a {@link ScreenRow.whole} row. */
export function layoutScreen(view: ScreenView, options: LayoutOptions): string[] {
  const { columns, look, mascot, compact = false, final = false, gap = false } = options;
  const column = Math.min(MAX_COLUMN, columns - 4);
  const indent = ' '.repeat(Math.max(0, Math.floor((columns - column) / 2)));
  const tone = (text: string, name: Tone) => paint(text, name, look);
  const centred = (text: string) => `${' '.repeat(Math.max(0, Math.floor((columns - textWidth(text)) / 2)))}${text}`;
  const lines: string[] = [''];

  if (mascot && mascot.length > 0) {
    lines.push(...mascot, centred(tone(`fig. ${view.handle} — ${view.emotion}`, 'muted')));
    if (!compact) {
      lines.push('');
    }
  }

  lines.push(centred(`${BOLD}${tone('agentinbox', 'foreground')}${NOT_BOLD} ${tone(view.command, 'secondary')}`));
  if (view.subtitle) {
    for (const line of wrapStyled(view.subtitle, columns - 4)) {
      lines.push(centred(tone(line, 'secondary')));
    }
  }

  const figure = view.figure?.every((line) => textWidth(line) < columns) ? view.figure : undefined;
  if (view.rows.length > 0 || figure) {
    const rule = `${indent}${tone('─'.repeat(column), 'rule')}`;
    if (!compact) {
      lines.push('');
    }
    lines.push(rule, ...layoutRows(view.rows, options, column, indent));
    for (const line of figure ?? []) {
      lines.push(centred(line));
    }
    lines.push(rule);
  } else if (view.status && !compact) {
    lines.push('');
  }

  if (view.status) {
    lines.push(...layoutStatus(view.status, options, column, indent));
  }
  if (final || gap) {
    lines.push('');
  }

  return lines;
}

/** How many terminal rows `lines` take, counting the rows a {@link ScreenRow.whole} row wraps onto. */
export function heightOf(lines: readonly string[], columns: number): number {
  return lines.reduce((sum, line) => sum + rowsOf(line, columns), 0);
}

/** How the screen is fitted onto the terminal: the mascot's width in dots (none: no mascot), and what is left out. */
export interface ScreenFit {
  mascotWidth?: number;
  compact: boolean;
  hiddenRows: number;
}

/**
 * The fullest way to show `view` in `rows` lines, keeping `reserve` of them free below it (for a question):
 * the largest mascot that fits; then no mascot, the rest staying as it is; then the blank lines dropped;
 * and at last the oldest rows of the list folded away. `null` when even that doesn't fit. The screen sits
 * above the line the cursor is on, which is why one line is always kept.
 */
export function fitScreen(
  view: ScreenView,
  {
    columns,
    rows,
    aspect,
    reserve = 0,
    final = false,
  }: { columns: number; rows: number; aspect: number; reserve?: number; final?: boolean }
): ScreenFit | null {
  const limit = rows - 1 - reserve;
  const fits = ({ mascotWidth, compact, hiddenRows }: ScreenFit) => {
    const mascot = mascotWidth ? new Array<string>(mascotLines(mascotWidth, aspect)).fill('') : undefined;
    const lines = layoutScreen(view, { columns, look: MEASURING, spinner: ' ', mascot, compact, hiddenRows, final });

    return heightOf(lines, columns) <= limit;
  };

  const candidates: ScreenFit[] = [];
  for (const mascotWidth of MASCOT_WIDTHS.filter((width) => width / 2 <= columns - 2)) {
    candidates.push({ mascotWidth, compact: false, hiddenRows: 0 }, { mascotWidth, compact: true, hiddenRows: 0 });
  }
  candidates.push({ compact: false, hiddenRows: 0 }, { compact: true, hiddenRows: 0 });
  for (let hiddenRows = 2; hiddenRows < view.rows.length; hiddenRows += 1) {
    candidates.push({ compact: true, hiddenRows });
  }

  return candidates.find(fits) ?? null;
}

function layoutRows(rows: readonly ScreenRow[], options: LayoutOptions, column: number, indent: string): string[] {
  const { look, hiddenRows = 0 } = options;
  const tone = (text: string, name: Tone) => paint(text, name, look);
  const shown = rows.slice(hiddenRows);
  const labelWidth = shown.reduce((widest, row) => Math.max(widest, textWidth(row.label ?? '') + 2), 2) - 2;
  // One space, the mark in three columns, one space, and the label in its column.
  const before = 5 + (labelWidth > 0 ? labelWidth + 2 : 0);
  const room = column - before;
  const lines: string[] = hiddenRows > 0 ? [`${indent} ${tone('⋯', 'muted')}`] : [];

  for (const row of shown) {
    const mark = row.mark ? tone(MARKS[row.mark].char, MARKS[row.mark].tone) : tone(row.step ?? '', 'muted');
    const label = labelWidth > 0 ? tone(row.label ?? '', 'secondary') : '';
    const head = `${indent} ${padEnd(mark, 3)} ${labelWidth > 0 ? padEnd(label, labelWidth + 2) : ''}`;
    const valueTone: Tone = row.mark === 'next' || row.mark === 'failed' ? 'foreground' : 'default';
    const text = `${tone(row.value, valueTone)}${row.note ? `  ${tone(row.note, 'muted')}` : ''}`;
    const values = row.whole ? [text] : wrapStyled(text, room);

    values.forEach((value, index) => {
      lines.push(`${index === 0 ? head : ' '.repeat(textWidth(indent) + before)}${value}`);
    });
  }

  return lines;
}

function layoutStatus(status: ScreenStatus, options: LayoutOptions, column: number, indent: string): string[] {
  const { look, spinner } = options;
  const tone = (text: string, name: Tone) => paint(text, name, look);
  // One space, the spinner and two spaces before the words.
  const before = 4;
  const hint = status.hint ? tone(status.hint, 'muted') : '';
  const head = `${indent} ${tone(spinner, 'accent')}  `;

  if (textWidth(status.text) + (hint ? textWidth(hint) + 2 : 0) <= column - before) {
    const gap = column - before - textWidth(status.text) - textWidth(hint);

    return [`${head}${tone(status.text, 'default')}${hint ? `${' '.repeat(gap)}${hint}` : ''}`];
  }

  // Too long for one line: the words wrap, and the hint gets lines of its own, at the right.
  const lines = wrapStyled(status.text, column - before).map(
    (line, index) => `${index === 0 ? head : ' '.repeat(textWidth(indent) + before)}${tone(line, 'default')}`
  );
  for (const line of status.hint ? wrapStyled(status.hint, column - before) : []) {
    lines.push(`${indent}${' '.repeat(column - textWidth(line))}${tone(line, 'muted')}`);
  }

  return lines;
}

function padEnd(text: string, width: number): string {
  return `${text}${' '.repeat(Math.max(0, width - textWidth(text)))}`;
}
