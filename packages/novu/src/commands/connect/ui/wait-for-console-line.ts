import readline from 'node:readline';
import { restoreStdinForConsole } from '../restore-stdin-for-console';

const INK_TEARDOWN_DELAY_MS = 75;

function prepareConsoleInput(): NodeJS.ReadStream {
  restoreStdinForConsole();

  if (!process.stdin.isTTY || process.stdin.destroyed || process.stdin.readableEnded) {
    throw new Error(
      'Interactive input is required, but no usable terminal is available. Run from a terminal or use --ci with explicit flags.'
    );
  }

  process.stdin.ref();
  process.stdin.resume();

  return process.stdin;
}

export async function waitForConsoleLine(): Promise<string> {
  await new Promise<void>((resolve) => setTimeout(resolve, INK_TEARDOWN_DELAY_MS));

  const input = prepareConsoleInput();

  const rl = readline.createInterface({
    input,
    output: process.stdout,
    terminal: true,
  });

  try {
    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      const onError = (error: Error) => {
        settled = true;
        reject(new Error(`Could not read console input: ${error.message}`));
      };
      const onClose = () => {
        if (!settled) {
          reject(new Error('Console input closed before a response was received.'));
        }
      };

      rl.once('line', (line) => {
        settled = true;
        resolve(line.trim());
      });
      rl.once('close', onClose);
      input.once('error', onError);
    });
  } finally {
    rl.close();
    input.pause();
    input.unref();
  }
}
