export function restoreStdinForConsole(): void {
  if (!process.stdin.isTTY) {
    return;
  }

  try {
    process.stdin.setRawMode(false);
  } catch {
    // stdin may not support raw mode outside an interactive TTY.
  }

  process.stdin.setEncoding('utf8');

  if (process.stdin.isPaused()) {
    process.stdin.resume();
  }
}
