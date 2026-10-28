/**
 * A live call with no open bridge stream for this long is treated as abandoned.
 * Keepalives on a parked stream refresh `lastBridgeRequestAt`, so a long park stays locked.
 */
export const VOICE_CALL_STALE_AFTER_MS = 90_000;

export function isVoiceCallStale(lastBridgeRequestAt: string | undefined, now = Date.now()): boolean {
  if (!lastBridgeRequestAt) {
    return false;
  }

  const last = Date.parse(lastBridgeRequestAt);
  if (!Number.isFinite(last)) {
    return false;
  }

  return now - last >= VOICE_CALL_STALE_AFTER_MS;
}
