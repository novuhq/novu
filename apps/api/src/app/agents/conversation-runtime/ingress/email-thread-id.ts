/**
 * Email threads are keyed `email:<uri-encoded address>:<hash>`, where the
 * address is the human on the other side of the thread.
 */
export function parseEmailThreadAddress(threadId: string): string | undefined {
  const parts = threadId.split(':');

  if (parts.length !== 3 || parts[0] !== 'email' || !parts[1]) {
    return undefined;
  }

  try {
    return decodeURIComponent(parts[1]);
  } catch {
    return undefined;
  }
}
