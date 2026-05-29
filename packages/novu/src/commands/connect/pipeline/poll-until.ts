export const CHANNEL_POLL_INTERVAL_MS = 2_000;
export const CHANNEL_POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PollOutcome = 'done' | 'pending' | 'failed';

/**
 * Poll `probe` until it returns `done`, `failed`, or the deadline elapses.
 * Transient probe errors are ignored and polling continues until the deadline.
 */
export async function pollUntil(
  probe: () => Promise<PollOutcome>,
  options: { intervalMs: number; timeoutMs: number }
): Promise<boolean> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    try {
      const outcome = await probe();
      if (outcome === 'done') return true;
      if (outcome === 'failed') return false;
    } catch {
      // transient — keep polling
    }
    await sleep(options.intervalMs);
  }

  return false;
}
