import readline from 'node:readline';
import pc from 'picocolors';
import { openedScreen } from './screen/opened';

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

/** Asks on the terminal, below the command's screen where it has one. */
export async function promptLine(question: string): Promise<string> {
  const screen = openedScreen();

  return screen ? screen.ask(question) : askLine(question);
}

/**
 * Like `promptLine`, but the typed answer is never echoed — for credentials
 * that should not end up in scrollback or a recorded session.
 */
export async function promptSecret(question: string): Promise<string> {
  const screen = openedScreen();

  return screen ? screen.ask(question, { secret: true }) : askSecret(question);
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
