/**
 * Create HMAC using subtle crypto.
 *
 * `crypto.subtle` is a Web Crypto API this is available in browsers,
 * Node.js, and most edge runtimes, such as Cloudflare Workers.
 *
 * @param secretKey - The secret key.
 * @param data - The data to hash.
 * @returns The HMAC.
 */
export const createHmacSubtle = async (secretKey: string, data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataBuffer = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Constant-time string comparison.
 *
 * Compares two strings in a way whose execution time depends only on the
 * length of `a`, not on where (or whether) the strings differ. Use this for
 * any secret/credential comparison such as HMAC signatures so an attacker
 * cannot use timing differences to recover bytes one at a time.
 *
 * Implemented with pure JS (no `node:crypto` import) so the same code path
 * works in browsers, edge runtimes (Cloudflare Workers, Vercel Edge), and
 * Node.js.
 *
 * @param a - The expected value (e.g. locally computed signature).
 * @param b - The untrusted value supplied by the caller.
 * @returns `true` iff the strings are byte-for-byte equal.
 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
};
