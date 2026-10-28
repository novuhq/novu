/** A live call with no bridge request for this long is treated as abandoned. */
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
