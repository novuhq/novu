import { once } from 'node:events';
import { restoreStdinForConsole } from './restore-stdin-for-console';

const INK_TEARDOWN_DELAY_MS = 75;

export async function waitForConsoleLine(): Promise<string> {
  restoreStdinForConsole();

  if (!process.stdin.isTTY) {
    return '';
  }

  await new Promise<void>((resolve) => setTimeout(resolve, INK_TEARDOWN_DELAY_MS));

  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  try {
    const [chunk] = await once(process.stdin, 'data');

    return String(chunk).replace(/\r?\n$/, '');
  } catch {
    return '';
  } finally {
    if (!process.stdin.isPaused()) {
      process.stdin.pause();
    }
  }
}
