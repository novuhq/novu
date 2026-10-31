import readline from 'node:readline';
import { Writable } from 'node:stream';
import pc from 'picocolors';
import { openedScreen } from './screen/opened';
import type { AskOptions } from './screen/screen';

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

/**
 * Reads an answer for a screen that draws it itself, so nothing is written to the terminal. Readline keeps
 * line editing (arrows, backspace, paste) working. Ctrl-C ends the command as it does everywhere else, and
 * so does Ctrl-D on an empty line, which leaves no way to answer.
 */
export async function readAnswer(
  { initial, onChange }: ReadOptions,
  {
    input = process.stdin as NodeJS.ReadableStream,
    interrupt = () => {
      // With readline gone nothing keeps the process alive, and a signal needs it to be to arrive.
      setTimeout(() => process.exit(130), 1000);
      process.kill(process.pid, 'SIGINT');
    },
  } = {}
): Promise<string> {
  const nowhere = new Writable({ write: (_chunk, _encoding, done) => done() });
  const rl = readline.createInterface({ input, output: nowhere, terminal: true });
  let answered = false;
  // Heard after readline's own listener, so the line already has this key in it.
  const report = () => {
    if (!answered) {
      onChange(rl.line, rl.cursor);
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
