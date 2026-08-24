/** Max UTF-8 bytes of `JSON.stringify(data)` for an ingested `{ type: 'custom' }` event. */
export const CUSTOM_AGENT_EVENT_DATA_MAX_BYTES = 65536;

/**
 * App-owned custom data is durable only when `name` is a non-empty string and
 * `data` serializes to at most 64KiB. Invalid events are skipped (no persist, no sequence, no WS).
 */
export function isPersistableCustomEvent(event: { name: unknown; data: unknown }): boolean {
  if (typeof event.name !== 'string' || event.name.length === 0) {
    return false;
  }

  try {
    const serialized = JSON.stringify(event.data ?? null);
    if (typeof serialized !== 'string') {
      return false;
    }

    return Buffer.byteLength(serialized, 'utf8') <= CUSTOM_AGENT_EVENT_DATA_MAX_BYTES;
  } catch {
    return false;
  }
}
