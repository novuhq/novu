import { messageOf } from '../shared/errors.ts';
import { stopping } from './process.ts';

let tag = 'box';

export function log(message: string): void {
  console.error(tag === 'box' ? `[box] ${new Date().toISOString()} ${message}` : `[${tag}] ${message}`);
}

export async function main(name: 'box' | 'cli' | 'ci', command: () => Promise<number | undefined>): Promise<void> {
  tag = name;
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => stopping.abort(new Error(`stopped by ${signal}`)));
  try {
    process.exitCode = (await command()) ?? 0;
  } catch (error) {
    log(`ERROR: ${messageOf(error)}`);
    process.exitCode = 1;
  }
}
