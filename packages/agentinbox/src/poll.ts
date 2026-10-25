export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollUntil(
  check: () => Promise<'done' | 'pending' | 'failed'>,
  options: { intervalMs: number; timeoutMs: number }
): Promise<boolean> {
  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() < deadline) {
    const result = await check();
    if (result === 'done') return true;
    if (result === 'failed') return false;
    await sleep(options.intervalMs);
  }

  return false;
}
