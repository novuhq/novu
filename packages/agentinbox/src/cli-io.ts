import readline from 'node:readline';
import { Writable } from 'node:stream';
import pc from 'picocolors';
import { openedScreen } from './screen/opened';
import type { AskOptions, PickOptions } from './screen/screen';

/**
 * A line about what is going on. Where the command has a screen open (a person at a terminal), it joins the
 * screen instead of being printed under it.
 */
export function info(message: string): void {
  const screen = openedScreen();
  if (screen) {
    screen.say(message);

    return;
  }

  process.stdout.write(`${pc.dim('•')} ${message}\n`);
}

/** Like `info`, for a step that is done: printed the same, and marked done on a screen. */
export function success(message: string): void {
  const screen = openedScreen();
  if (screen) {
    screen.add({ mark: 'done', value: message });

    return;
  }

  info(message);
}

/** Like `info`, for something that went wrong without stopping the command: in yellow, or marked on a screen. */
export function warn(message: string): void {
  const screen = openedScreen();
  if (screen) {
    screen.add({ mark: 'failed', value: message });

    return;
  }

  info(pc.yellow(message));
}

/** Asks on the command's screen where it has one, or else on the terminal. */
export async function promptLine(question: string, options: AskOptions = {}): Promise<string> {
  const screen = openedScreen();

  return screen ? screen.ask(question, options) : askOffering(question, options, askLine);
}

/**
 * Like `promptLine`, but the typed answer is never echoed — for credentials
 * that should not end up in scrollback or a recorded session.
 */
export async function promptSecret(question: string): Promise<string> {
  const screen = openedScreen();

  return screen ? screen.ask(question, { secret: true }) : askSecret(question);
}

/**
 * Asks for one of a few on the command's screen where it has one, picked with the arrow keys. Without a screen
 * nothing can be drawn in place, so the choices are named and one is typed (see {@link pickTyped}).
 */
export async function promptPick<Choice extends string>(
  question: string,
  options: PickOptions<Choice>
): Promise<Choice> {
  const screen = openedScreen();

  return screen
    ? screen.pick(question, options)
    : pickTyped(question, options, { ask: askLine, say: (text) => process.stdout.write(text) });
}

const MAX_PICK_ATTEMPTS = 5;

/**
 * Asks for one of a few where nothing can be drawn in place: the question names them, and one is typed, by its
 * name or by its place among them. Enter keeps the one on offer. An answer that is none of them is asked again,
 * and after a few of those the one on offer stays: nothing picked this way is worth stopping a command for.
 * `ask` does the asking, and `say` tells the person what there is to pick from.
 */
export async function pickTyped<Choice extends string>(
  question: string,
  { choices, initial = choices[0] }: Pick<PickOptions<Choice>, 'choices' | 'initial'>,
  { ask, say }: { ask: (question: string) => Promise<string>; say: (text: string) => void }
): Promise<Choice> {
  const named = `${choices.slice(0, -1).join(', ')} or ${choices[choices.length - 1]}`;
  const naming = `${question.replace(/:\s*$/, '')} (${named}): `;

  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
    const answer = (await askOffering(naming, { initial }, ask)).trim().toLowerCase();
    const place = /^\d+$/.test(answer) ? Number(answer) : 0;
    const picked = choices.find((choice, index) => choice.toLowerCase() === answer || index + 1 === place);
    if (picked) {
      return picked;
    }

    say(`${pc.yellow(`Pick ${named}.`)}\n`);
  }

  return initial;
}

/**
 * Asks where an answer can't start out filled in: what is on offer shows in brackets, and Enter takes it.
 * `ask` does the asking.
 */
export async function askOffering(
  question: string,
  { initial, suffix = '' }: Pick<AskOptions, 'initial' | 'suffix'>,
  ask: (question: string) => Promise<string>
): Promise<string> {
  if (!initial) {
    return ask(question);
  }

  const answer = await ask(`${question.replace(/:\s*$/, '')} [${initial}${suffix}]: `);

  return answer.trim() || initial;
}

/** Asks on the terminal and gives the answer, whatever is on screen. */
export async function askLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await new Promise((resolve) => {
      rl.question(question, resolve);
    });
  } finally {
    rl.close();
  }
}

/**
 * Like `askLine`, but the typed answer is never echoed. Readline keeps line editing (backspace, paste)
 * working; only its output is swallowed.
 */
export async function askSecret(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const mutable = rl as readline.Interface & { _writeToOutput?: (text: string) => void };
  const writeToOutput = mutable._writeToOutput?.bind(rl);
  let muted = false;
  mutable._writeToOutput = (text) => {
    if (!muted) writeToOutput?.(text);
  };

  try {
    return await new Promise((resolve) => {
      rl.question(question, (answer) => {
        process.stdout.write('\n');
        resolve(answer);
      });
      // The question itself has been written by now; everything after is the answer.
      muted = true;
    });
  } finally {
    rl.close();
  }
}

export interface ReadOptions {
  /** What the answer starts as. */
  initial?: string;
  /** Told the answer, and where the cursor is in it, after every key. */
  onChange: (answer: string, cursor: number) => void;
}

export interface PickReadOptions {
  /** How many there are to pick from. */
  count: number;
  /** The place of the one the person starts on. */
  initial: number;
  /** Told the place the person is on, after every key that moves them. */
  onMove: (index: number) => void;
}

/** Where keys are read from, and what ends the command when the person gives up on answering. */
interface ReadFrom {
  input?: NodeJS.ReadableStream;
  interrupt?: () => void;
}

/** How far each arrow key moves a pick: back for ← and ↑, on for → and ↓. */
const ARROW_STEPS = new Map([
  ['left', -1],
  ['up', -1],
  ['right', 1],
  ['down', 1],
]);

/**
 * Reads an answer for a screen that draws it itself, so nothing is written to the terminal. Readline keeps
 * line editing (arrows, backspace, paste) working. Ctrl-C ends the command as it does everywhere else, and
 * so does Ctrl-D on an empty line, which leaves no way to answer.
 */
export async function readAnswer({ initial, onChange }: ReadOptions, from: ReadFrom = {}): Promise<string> {
  return readQuietly(from, initial, (rl) => onChange(rl.line, rl.cursor));
}

/**
 * Reads a pick for a screen that draws it itself: the arrow keys move through what there is to pick from, round
 * and round, and Enter takes the one the person is on. Nothing is written to the terminal, and whatever else is
 * typed counts for nothing. Ctrl-C and Ctrl-D end the command, as in {@link readAnswer}.
 */
export async function readPick({ count, initial, onMove }: PickReadOptions, from: ReadFrom = {}): Promise<number> {
  let index = initial;

  await readQuietly(from, undefined, (rl, key) => {
    // What was typed is out of sight but still on readline's line, where Ctrl-D only deletes. Here it ends the
    // command whatever was typed, as it does on the empty line the person sees.
    if (key?.ctrl && key.name === 'd') {
      rl.close();

      return;
    }

    const step = ARROW_STEPS.get(key?.name ?? '');
    if (step) {
      index = (index + step + count) % count;
      onMove(index);
    }
  });

  return index;
}

/** Reads a line without writing anything, telling `onKey` of every key until Enter. */
async function readQuietly(
  {
    input = process.stdin as NodeJS.ReadableStream,
    interrupt = () => {
      // With readline gone nothing keeps the process alive, and a signal needs it to be to arrive.
      setTimeout(() => process.exit(130), 1000);
      process.kill(process.pid, 'SIGINT');
    },
  }: ReadFrom,
  initial: string | undefined,
  onKey: (rl: readline.Interface, key: readline.Key | undefined) => void
): Promise<string> {
  const nowhere = new Writable({ write: (_chunk, _encoding, done) => done() });
  const rl = readline.createInterface({ input, output: nowhere, terminal: true });
  let answered = false;
  // Heard after readline's own listener, so the line already has this key in it.
  const report = (_text: string | undefined, key: readline.Key | undefined) => {
    if (!answered) {
      onKey(rl, key);
    }
  };

  input.on('keypress', report);
  rl.on('SIGINT', () => rl.close());
  rl.on('close', () => {
    if (!answered) {
      interrupt();
    }
  });

  try {
    return await new Promise<string>((resolve) => {
      rl.question('', (answer) => {
        answered = true;
        resolve(answer);
      });
      if (initial) {
        rl.write(initial);
      }
    });
  } finally {
    input.off('keypress', report);
    rl.close();
  }
}
