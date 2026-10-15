import readline from 'node:readline';
import pc from 'picocolors';

export function info(message: string): void {
  process.stdout.write(`${pc.dim('•')} ${message}\n`);
}

export async function promptLine(question: string): Promise<string> {
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
 * Like `promptLine`, but the typed answer is never echoed — for credentials
 * that should not end up in scrollback or a recorded session. Readline keeps
 * line editing (backspace, paste) working; only its output is swallowed.
 */
export async function promptSecret(question: string): Promise<string> {
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
