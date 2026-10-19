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

  // Ink's stdin stream and /dev/tty reference the same terminal. Keep the
  // Node stream paused so it cannot consume input intended for an inherited
  // OAuth process or a fresh /dev/tty prompt.
  if (!process.stdin.isPaused()) {
    process.stdin.pause();
  }

  process.stdin.unref();
}
