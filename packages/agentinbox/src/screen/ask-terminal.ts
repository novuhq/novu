import type { Theme } from '../mascot/drawing';
import { CSI } from './terminal';

/** What the screen asks the terminal before it draws anything. */
export interface TerminalLook {
  /** How tall a row of braille dots is for one dot's width: 1 where a character is twice as tall as wide. */
  aspect: number;
  /** Whether the background is dark or light. */
  theme: Theme;
}

/** What asking the terminal needs of stdin: a terminal it can read in raw mode. */
export interface AnswerInput {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => unknown;
  resume: () => unknown;
  pause: () => unknown;
  on: (event: 'data', listener: (chunk: Buffer | string) => void) => unknown;
  off: (event: 'data', listener: (chunk: Buffer | string) => void) => unknown;
}

export interface QuestionOutput {
  isTTY?: boolean;
  write: (text: string) => unknown;
}

/** How long to wait for the answers. Terminals that know the questions answer within a few milliseconds. */
const ANSWERS_WITHIN_MS = 250;

/** The answer to `CSI 16 t`: a character's height and width in pixels. */
const CELL_SIZE = /\x1b\[6;(\d+);(\d+)t/;

/** The answer to `OSC 11 ; ?`: the background as `rgb:` and 1 to 4 hex digits a channel, then BEL or ST. */
const BACKGROUND = /\x1b\]11;rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})(?:\x07|\x1b\\)/i;

/**
 * Asks the terminal, once and before anything else reads stdin, two things the screen is drawn by:
 * - its character size in pixels (`CSI 16 t`), so the mascot is drawn in true proportions and stays round;
 * - its background colour (`OSC 11`), so a light background gets the light colours and the mascot's eyes
 *   cut out of it.
 *
 * Both questions go at once and the answers are awaited for at most 250ms. Stdin is read in raw mode
 * meanwhile, so the answers are never shown and never left for a prompt to read; raw mode is put back and
 * stdin paused however it ends. Without a terminal to ask, or without an answer, the dots are taken as square
 * and the background from `COLORFGBG` where it says, or else as dark. `AGENTINBOX_MASCOT_ASPECT` and
 * `AGENTINBOX_THEME` (`dark` or `light`) answer instead of the terminal.
 */
export async function askTerminal(
  input: AnswerInput,
  output: QuestionOutput,
  env: NodeJS.ProcessEnv,
  { timeoutMs = ANSWERS_WITHIN_MS, interrupt = () => process.kill(process.pid, 'SIGINT') } = {}
): Promise<TerminalLook> {
  const told = { aspect: aspectFromEnv(env), theme: themeFromEnv(env) };
  const answers: Partial<TerminalLook> = {};

  if (
    (told.aspect === undefined || told.theme === undefined) &&
    input.isTTY &&
    output.isTTY &&
    typeof input.setRawMode === 'function'
  ) {
    await readAnswers(input, output, answers, timeoutMs, interrupt);
  }

  return {
    aspect: told.aspect ?? answers.aspect ?? 1,
    theme: told.theme ?? answers.theme ?? themeFromColorFgBg(env.COLORFGBG) ?? 'dark',
  };
}

/** The dot aspect in an answer to `CSI 16 t`, where it is a sensible one. */
export function aspectFromAnswer(answer: string): number | undefined {
  const size = CELL_SIZE.exec(answer);
  if (!size) {
    return undefined;
  }

  const [height, width] = [Number(size[1]), Number(size[2])];
  const aspect = height / (2 * width);

  return width > 0 && height > 0 && aspect >= 0.5 && aspect <= 3 ? aspect : undefined;
}

/** The theme in an answer to `OSC 11 ; ?`: light where the background's luminance is above a half. */
export function themeFromAnswer(answer: string): Theme | undefined {
  const background = BACKGROUND.exec(answer);
  if (!background) {
    return undefined;
  }

  const [red, green, blue] = background.slice(1, 4).map((hex) => Number.parseInt(hex, 16) / (16 ** hex.length - 1));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.5 ? 'light' : 'dark';
}

/**
 * The theme `COLORFGBG` gives, as some terminals set it: `foreground;background` in the 16 basic colours,
 * where a background of 7 or 15 is light and 0 to 6 or 8 is dark.
 */
export function themeFromColorFgBg(value: string | undefined): Theme | undefined {
  const background = Number(value?.split(';').at(-1));
  if (background === 7 || background === 15) {
    return 'light';
  }

  return Number.isInteger(background) && ((background >= 0 && background <= 6) || background === 8)
    ? 'dark'
    : undefined;
}

/** `AGENTINBOX_MASCOT_ASPECT`, where it holds a sensible number. */
export function aspectFromEnv(env: NodeJS.ProcessEnv): number | undefined {
  const aspect = Number(env.AGENTINBOX_MASCOT_ASPECT);

  return env.AGENTINBOX_MASCOT_ASPECT?.trim() && Number.isFinite(aspect) && aspect >= 0.5 && aspect <= 3
    ? aspect
    : undefined;
}

/** `AGENTINBOX_THEME`, where it is `dark` or `light`. */
export function themeFromEnv(env: NodeJS.ProcessEnv): Theme | undefined {
  const theme = env.AGENTINBOX_THEME?.trim().toLowerCase();

  return theme === 'dark' || theme === 'light' ? theme : undefined;
}

function readAnswers(
  input: AnswerInput,
  output: QuestionOutput,
  answers: Partial<TerminalLook>,
  timeoutMs: number,
  interrupt: () => void
): Promise<void> {
  const setRawMode = (input.setRawMode as (mode: boolean) => unknown).bind(input);
  const wasRaw = Boolean(input.isRaw);

  return new Promise((resolve) => {
    let received = '';
    let interrupted = false;

    const finish = () => {
      clearTimeout(timer);
      input.off('data', read);
      setRawMode(wasRaw);
      input.pause();
      resolve();
      // Ctrl-C while raw mode was on arrives as a character instead of a signal; it is passed on as one.
      if (interrupted) {
        interrupt();
      }
    };

    const read = (chunk: Buffer | string) => {
      received += chunk.toString();
      if (received.includes('\x03')) {
        interrupted = true;
        finish();

        return;
      }

      answers.aspect ??= aspectFromAnswer(received);
      answers.theme ??= themeFromAnswer(received);
      if (answers.aspect !== undefined && answers.theme !== undefined) {
        finish();
      }
    };

    const timer = setTimeout(finish, timeoutMs);
    setRawMode(true);
    input.on('data', read);
    input.resume();
    output.write(`${CSI}16t\x1b]11;?\x07`);
  });
}
