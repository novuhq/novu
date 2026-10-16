import { stopping } from './process.ts';

let tag = 'box';

// The box's lines carry the time: its logs are read afterwards (/data/logs, a bake's output).
export function log(message: string): void {
  console.error(tag === 'box' ? `[box] ${new Date().toISOString()} ${message}` : `[${tag}] ${message}`);
}

// Runs an entrypoint: its result is the exit code, and a failure says why on one line and exits 1. The first
// SIGTERM or SIGINT stops every child (process.ts) and lets the command fail on its own; a second one kills.
export async function main(name: 'box' | 'cli' | 'ci', command: () => Promise<number | undefined>): Promise<void> {
  tag = name;
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => stopping.abort(new Error(`stopped by ${signal}`)));
  try {
    process.exitCode = (await command()) ?? 0;
  } catch (error) {
    log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
