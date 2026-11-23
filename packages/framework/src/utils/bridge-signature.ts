interface ParsedSignatureHeader {
  t?: number;
  /** First `v1`. Verifiers must check {@link ParsedSignatureHeader.v1s}. */
  v1?: string;
  /** Every `v1` in the header. One per active secret key during rotation. */
  v1s: string[];
}

/**
 * Parse a `Novu-Signature` header into its named fields.
 *
 * Header format: `t=<unix-ms>,v1=<hex-hmac>[,v1=<hex-hmac>...]` (order/whitespace tolerant).
 * Each `v1` is the same payload signed with a different active secret key.
 *
 * Splitting only on `=` was previously used here, which broke the timestamp
 * extraction (`timestamp` ended up as the literal string "t") and silently
 * disabled replay protection. We now split each comma-separated part on the
 * first `=` only and look up fields by name so additional or reordered fields
 * cannot bypass validation.
 */
export function parseSignatureHeader(header: string): ParsedSignatureHeader {
  const fields: Record<string, string> = {};
  const v1s: string[] = [];

  for (const rawPart of header.split(',')) {
    const part = rawPart.trim();
    if (!part) {
      continue;
    }

    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }

    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);
    if (!key || !value) {
      continue;
    }

    if (key === 'v1') {
      v1s.push(value);
    }

    if (!(key in fields)) {
      fields[key] = value;
    }
  }

  const tRaw = fields.t;
  const t = tRaw !== undefined ? Number(tRaw) : Number.NaN;

  return {
    t: Number.isFinite(t) ? t : undefined,
    v1: fields.v1,
    v1s,
  };
}
