import type { Emotion } from '../mascot/life';
import { askTerminal } from './ask-terminal';
import type { ScreenRow, ScreenStatus, Tone } from './layout';
import { processHost, startLiveScreen } from './live-screen';
import { MIN_COLUMNS, screenColors } from './terminal';

export type { Emotion } from '../mascot/life';
export type { RowMark, ScreenRow, ScreenStatus } from './layout';
export { openedScreen } from './opened';

/** A wait the screen shows: what it waits for, and anything that helps meanwhile, such as a link and a QR code. */
export interface ScreenWait {
  status: ScreenStatus;
  subtitle?: string;
  rows?: ScreenRow[];
  /** Lines drawn as they are, such as a QR code. */
  figure?: string[];
  /** What stays in the list once the wait is over, so the screen keeps what it said. */
  said?: string;
}

/** Words under a question being answered, such as whether an address is free. */
export interface AskNote {
  text: string;
  tone: Extract<Tone, 'success' | 'accent' | 'muted'>;
}

export interface AskOptions {
  /** The answer isn't shown as it is typed, nor kept: a pasted token. */
  secret?: boolean;
  /**
   * The row that keeps the answer once the question is gone, or `undefined` for none. By default the question
   * and the answer, with dots for a secret one; nothing for an empty answer.
   */
  remember?: (answer: string) => ScreenRow | undefined;
  /** What the answer starts as, for the person to keep or change. */
  initial?: string;
  /** Follows the answer without being part of it, such as the domain after an address. */
  suffix?: string;
  /** How the answer shows as it is typed, character for character: an address has no capitals. */
  display?: (answer: string) => string;
  /** Says something about `initial` from the start. */
  note?: AskNote;
  /**
   * Looks at the answer once the person stops typing, for the words under it. A result for an answer changed
   * since is dropped, and one that fails says nothing: this only helps, so whoever asked checks what comes back.
   */
  check?: (answer: string) => Promise<AskNote | undefined>;
}

/**
 * The shared terminal layout of a command: the mascot, the command, a line under it, a list of rows and what
 * is under way, drawn in place and kept up to date. Any command can open one; what it shows is up to the
 * command. It is only ever open for a person at a terminal (see {@link openScreen}), so a command that has
 * one prints its plain output otherwise, exactly as before.
 */
export interface Screen {
  /** What the mascot feels. While something is under way, `awake` shows as `thinking`. */
  feel(emotion: Emotion): void;
  /** The line under the command. */
  subtitle(text: string | undefined): void;
  /** Puts these rows in place of the list. */
  rows(rows: readonly ScreenRow[]): void;
  /** Adds rows at the end of the list. */
  add(...rows: ScreenRow[]): void;
  /**
   * A line as `info` prints it. One ending in `...` is something under way: it shows on the status line,
   * and joins the list as done when the next thing happens. Any other line joins the list.
   */
  say(message: string): void;
  /** Shows a wait until the function it returns is called, which takes it all away again. */
  wait(wait: ScreenWait): () => void;
  /** Shows text with the next question, such as a menu or how to get a token. It goes once that one is answered. */
  print(text: string): void;
  /**
   * Asks at the end of the list, with the very words a plain terminal shows. The answer is drawn there as it
   * is typed and stays in the list, and everything else keeps moving meanwhile.
   */
  ask(question: string, options?: AskOptions): Promise<string>;
  /** Ends the screen on the mascot's own still face for `emotion`, once its eyes have got there. */
  done(emotion: 'happy' | 'asleep'): Promise<void>;
  /** Ends the screen with `message` as a ✕ row (a → row for something still `pending`), the mascot asleep. */
  fail(message: string, options?: { pending?: boolean }): Promise<void>;
}

export interface ScreenOptions {
  /** The command after `agentinbox`, as typed: `login`, `setup telegram`. */
  command: string;
  /** The agent's handle, where it is known. */
  handle?: string;
}

/**
 * Opens the screen for a person at a terminal, or gives `null` where the command should print what it always
 * printed: a pipe, a file, CI, colour turned off (see `screenColors`), or a terminal narrower than 48
 * columns. Before anything is drawn the terminal is asked how its characters are shaped, so the mascot comes
 * out round, and whether its background is light (see `askTerminal`).
 */
export async function openScreen(options: ScreenOptions): Promise<Screen | null> {
  const colors = screenColors(process.stdout, process.stderr, process.env);
  if (!colors || (process.stdout.columns ?? 0) < MIN_COLUMNS) {
    return null;
  }

  const look = await askTerminal(process.stdin, process.stdout, process.env);

  return startLiveScreen(options, processHost(colors, look));
}
