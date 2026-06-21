import { randomBytes } from 'node:crypto';

/** Base62 alphabet — alphanumeric only, safe for GFM bare-URL autolinking. */
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE62_ZERO_CHAR = '0';
const BASE62_RADIX = 62n;
const DEFAULT_TOKEN_BYTES = 24;
const DEFAULT_TOKEN_LENGTH = 32;

/** Upper bound for uniform 32-char base62 tokens (~190.5 bits of entropy). 62^32 as bigint. */
const MAX_BASE62_TOKEN_VALUE = BigInt('2272657884496751345355241563627544170162852933518655225856');

function encodeBase62(value: bigint, length: number): string {
  if (value === 0n) {
    return BASE62_ZERO_CHAR.repeat(length);
  }

  let encoded = '';

  while (value > 0n) {
    const remainder = Number(value % BASE62_RADIX);
    encoded = BASE62_ALPHABET[remainder] + encoded;
    value = value / BASE62_RADIX;
  }

  return encoded.padStart(length, BASE62_ZERO_CHAR);
}

function randomBigIntBelow(max: bigint, bytes: number): bigint {
  while (true) {
    const buffer = randomBytes(bytes);
    let value = 0n;

    for (const byte of buffer) {
      value = (value << 8n) | BigInt(byte);
    }

    if (value < max) {
      return value;
    }
  }
}

/**
 * Mint a fixed-width opaque token using only [A-Za-z0-9].
 *
 * Uses 24 random bytes with rejection sampling into base62, producing exactly
 * 32 characters. Effective entropy is ~190.5 bits (62^32), slightly below the
 * raw 192 bits of the input bytes because 62^32 < 2^192.
 */
export function mintAutolinkSafeOpaqueToken(bytes = DEFAULT_TOKEN_BYTES): string {
  if (bytes !== DEFAULT_TOKEN_BYTES) {
    throw new Error(`mintAutolinkSafeOpaqueToken supports ${DEFAULT_TOKEN_BYTES} bytes only`);
  }

  const value = randomBigIntBelow(MAX_BASE62_TOKEN_VALUE, bytes);

  return encodeBase62(value, DEFAULT_TOKEN_LENGTH);
}
