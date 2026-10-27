import { setTimeout as sleep } from 'node:timers/promises';
import { stopping } from './process.ts';

export interface PollOptions<T> {
  readonly timeoutMs: number;
  readonly everyMs?: number;
  readonly what?: string | (() => string);
  readonly signal?: AbortSignal | undefined;
  readonly orElse?: () => T;
}

export async function poll<T>(check: () => Promise<T | null | undefined | false>, options: PollOptions<T>): Promise<T> {
  const { timeoutMs, everyMs = 1000, what = 'not yet', signal, orElse } = options;
  const until = Date.now() + timeoutMs;
  const abort = AbortSignal.any([stopping.signal, ...(signal ? [signal] : [])]);
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() + everyMs > until) {
      if (orElse) return orElse();
      throw new Error(`${typeof what === 'function' ? what() : what} after ${Math.round(timeoutMs / 1000)}s`);
    }
    await sleep(everyMs, undefined, { signal: abort });
  }
}
