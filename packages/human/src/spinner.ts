import pc from 'picocolors';

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
 * Waiting indicator for blocking commands. Renders on stderr so stdout stays
 * a clean machine-readable channel for agents. On a TTY it's a live single
 * line (spinner + elapsed time); otherwise a single static log line.
 */
export function startWaitIndicator(message: string, hint?: string): () => void {
  if (!process.stderr.isTTY) {
    process.stderr.write(`${message}${hint ? ` (${hint})` : ''}\n`);

    return () => {};
  }

  const startedAt = Date.now();
  let frame = 0;

  const render = () => {
    const line = `${pc.cyan(FRAMES[frame % FRAMES.length])} ${message} ${pc.dim(`· ${formatElapsed(startedAt)}`)}${
      hint ? pc.dim(` · ${hint}`) : ''
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
