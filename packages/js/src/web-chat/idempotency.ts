export function mintClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `${prefix}_${Date.now().toString(36).slice(-12)}`;
}

/** Client-generated message idempotency key (`msg_*`). Sent as `messageId` on accept. */
export function createMessageIdempotencyKey(): string {
  return mintClientId('msg');
}

/** Stable action idempotency key (`idem_*`) derived from scope. Same scope → same key. */
export function createActionIdempotencyKeyForScope(scope: string): string {
  let h1 = 2_166_136_261;
  let h2 = 2_166_136_261 ^ scope.length;

  for (let i = 0; i < scope.length; i++) {
    const code = scope.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16_777_619);
    h2 ^= code << (i % 16);
    h2 = Math.imul(h2, 16_777_619);
  }

  const slug = `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`
    .replace(/[^0-9a-z]/g, '')
    .slice(0, 12)
    .padEnd(12, '0');

  return `idem_${slug}`;
}
