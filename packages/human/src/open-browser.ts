import { spawn } from 'node:child_process';

/** Best-effort platform browser open — callers always print the URL as a fallback. */
export function openInBrowser(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

  try {
    spawn(command, [url], { stdio: 'ignore', detached: true })
      .on('error', () => undefined)
      .unref();
  } catch {
    // The URL is printed — the human can click it.
  }
}
