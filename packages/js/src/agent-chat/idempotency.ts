const MESSAGE_ID_PATTERN = /^msg_[0-9a-z]{12}$/;
const ACTION_IDEMPOTENCY_PATTERN = /^idem_[0-9a-z]{12}$/;

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

/** Client-minted message idempotency key (`msg_*`). Sent as `messageId` on accept. */
export function createMessageIdempotencyKey(): string {
  return mintClientId('msg');
}

/** Client-minted action idempotency key (`idem_*`). Sent as `idempotencyKey` on accept. */
export function createActionIdempotencyKey(): string {
  return mintClientId('idem');
}

export function isValidMessageIdempotencyKey(value: string): boolean {
  return MESSAGE_ID_PATTERN.test(value);
}

export function isValidActionIdempotencyKey(value: string): boolean {
  return ACTION_IDEMPOTENCY_PATTERN.test(value);
}
