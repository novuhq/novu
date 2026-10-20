import pc from 'picocolors';
import { openedScreen } from './screen/opened';
import { charWidth, textWidth } from './screen/terminal';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function formatElapsed(startedAt: number): string {
  const totalSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);

    return `${hours}h${minutes % 60}m`;
  }

  return minutes > 0 ? `${minutes}m${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

/**
 * The message and hint cut down to one line of the terminal. A longer line wraps, and `\r` then only goes
 * back to its last row, so every frame would leave a copy behind. The hint goes first, then the end of the
 * message.
 */
export function fitToWidth(
  message: string,
  elapsed: string,
  hint: string | undefined,
  columns: number | undefined
): { message: string; hint?: string } {
  if (!columns) {
    return { message, hint };
  }

  // The frame and the spaces either side of the message, and a column to spare so the cursor never wraps.
  // Measured in columns: a wide character, as in Chinese or Japanese, takes two.
  const room = columns - textWidth(elapsed) - 4;
  if (hint && textWidth(message) + textWidth(hint) + 3 <= room) {
    return { message, hint };
  }

  return { message: textWidth(message) <= room ? message : `${clipToColumns(message, room - 1)}…` };
}

/** The start of `text` that fits in `columns` columns. */
function clipToColumns(text: string, columns: number): string {
  let used = 0;
  let clipped = '';
  for (const char of text) {
    used += charWidth(char.codePointAt(0) ?? 0);
    if (used > columns) {
      break;
    }
    clipped += char;
  }

  return clipped;
}

/**
 * Waiting indicator for blocking commands. Renders on stderr so stdout stays
 * a clean machine-readable channel for agents. On a TTY it's a live single
 * line (spinner + elapsed time); otherwise a single static log line. Where the
 * command has a screen open, the screen shows the wait instead.
 */
export function startWaitIndicator(message: string, hint?: string): () => void {
  const screen = openedScreen();
  if (screen) {
    return screen.wait({ status: { text: message, hint } });
  }

  if (!process.stderr.isTTY) {
    process.stderr.write(`${message}${hint ? ` (${hint})` : ''}\n`);

    return () => {};
  }

  const startedAt = Date.now();
  let frame = 0;

  const render = () => {
    const elapsed = `· ${formatElapsed(startedAt)}`;
    const fitted = fitToWidth(message, elapsed, hint, process.stderr.columns);
    const line = `${pc.cyan(FRAMES[frame % FRAMES.length])} ${fitted.message} ${pc.dim(elapsed)}${
      fitted.hint ? pc.dim(` · ${fitted.hint}`) : ''
    }`;
    frame += 1;
    process.stderr.write(`\r\x1b[2K${line}`);
  };

  render();
  const timer = setInterval(render, 120);
  timer.unref?.();

  return () => {
    clearInterval(timer);
    process.stderr.write('\r\x1b[2K');
  };
}
