import type { Rgb } from '../mascot/drawing';

/** How colours are written: in 24-bit, or as the closest of the 256 xterm colours. */
export type ColorMode = 'truecolor' | 'ansi256';

/** What the screen needs to know of an output stream such as `process.stdout`. */
export interface TerminalStream {
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}

/** Narrower than this, a command prints what it always printed. */
export const MIN_COLUMNS = 48;

/** Moves and erasing, as written to the terminal. */
export const CSI = '\x1b[';

/**
 * The colours the screen is drawn in, or `null` where it isn't drawn at all. Only a person watching a terminal
 * sees it: both stdout and stderr have to be one, and colour must be on. So never in a pipe, a file or CI, or
 * with `NO_COLOR`, `FORCE_COLOR=0` or `TERM=dumb`: everything agents read stays exactly as it was.
 */
export function screenColors(stdout: TerminalStream, stderr: TerminalStream, env: NodeJS.ProcessEnv): ColorMode | null {
  const colorOff = Boolean(env.NO_COLOR) || env.FORCE_COLOR === '0' || env.FORCE_COLOR === 'false';
  const inCi = Boolean(env.CI) && env.CI !== 'false' && env.CI !== '0';

  if (!stdout.isTTY || !stderr.isTTY || colorOff || inCi || env.TERM === 'dumb') {
    return null;
  }

  return /^(truecolor|24bit)$/i.test(env.COLORTERM ?? '') ? 'truecolor' : 'ansi256';
}

/** `AGENTINBOX_NO_ANIMATION=1` draws the still faces only, for anyone who'd rather nothing moved. */
export function animationOff(env: NodeJS.ProcessEnv): boolean {
  const value = env.AGENTINBOX_NO_ANIMATION?.trim().toLowerCase();

  return Boolean(value) && value !== '0' && value !== 'false';
}

/** The escape that writes in `rgb` from here on. */
export function foreground(rgb: Rgb, mode: ColorMode): string {
  return mode === 'truecolor' ? `${CSI}38;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `${CSI}38;5;${nearestAnsi256(rgb)}m`;
}

/** The 256 colours' levels for each of red, green and blue in their 6 x 6 x 6 cube. */
const CUBE_LEVELS = [0, 95, 135, 175, 215, 255];

const nearest = new Map<number, number>();

/**
 * The closest of the 256 xterm colours to `rgb`, from its colour cube (16 to 231) and its greys (232 to 255),
 * leaving out the 16 basic ones every terminal sets differently. Each colour is worked out once.
 */
export function nearestAnsi256(rgb: Rgb): number {
  const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  const known = nearest.get(key);
  if (known !== undefined) {
    return known;
  }

  let best = 16;
  let bestDistance = Number.POSITIVE_INFINITY;
  const consider = (code: number, candidate: Rgb) => {
    // Weighted for how the eye sees: green counts most, blue least.
    const distance =
      2 * (candidate[0] - rgb[0]) ** 2 + 4 * (candidate[1] - rgb[1]) ** 2 + 3 * (candidate[2] - rgb[2]) ** 2;
    if (distance < bestDistance) {
      best = code;
      bestDistance = distance;
    }
  };

  for (let red = 0; red < 6; red += 1) {
    for (let green = 0; green < 6; green += 1) {
      for (let blue = 0; blue < 6; blue += 1) {
        consider(16 + 36 * red + 6 * green + blue, [CUBE_LEVELS[red], CUBE_LEVELS[green], CUBE_LEVELS[blue]]);
      }
    }
  }
  for (let grey = 0; grey < 24; grey += 1) {
    const level = 8 + grey * 10;
    consider(232 + grey, [level, level, level]);
  }

  nearest.set(key, best);

  return best;
}

/** Every escape sequence: colours and styles, moves and erasing, and links. */
const ESCAPES = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

export function stripEscapes(text: string): string {
  return text.replace(ESCAPES, '');
}

/** How many columns `text` takes on the terminal, without its escapes. */
export function textWidth(text: string): number {
  let width = 0;
  for (const char of stripEscapes(text)) {
    width += charWidth(char.codePointAt(0) ?? 0);
  }

  return width;
}

/** How many rows of a terminal `columns` wide a line of `text` takes, once the terminal wraps it. */
export function rowsOf(text: string, columns: number): number {
  return Math.max(1, Math.ceil(textWidth(text) / Math.max(1, columns)));
}

/**
 * How many columns a character takes: none for marks that combine with the one before, two for the wide
 * characters of East Asian scripts and for most emoji, one for everything else.
 */
export function charWidth(code: number): number {
  if (code < 32 || (code >= 0x300 && code <= 0x36f) || code === 0x200d || (code >= 0xfe00 && code <= 0xfe0f)) {
    return 0;
  }

  const wide =
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd);

  return wide ? 2 : 1;
}
