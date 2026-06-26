interface ParsedSignatureHeader {
  t?: number;
  v1?: string;
}

/**
 * Parse a `Novu-Signature` header into its named fields.
 *
 * Header format: `t=<unix-ms>,v1=<hex-hmac>` (order/whitespace tolerant).
 *
 * Splitting only on `=` was previously used here, which broke the timestamp
 * extraction (`timestamp` ended up as the literal string "t") and silently
 * disabled replay protection. We now split each comma-separated part on the
 * first `=` only and look up fields by name so additional or reordered fields
 * cannot bypass validation.
 */
export function parseSignatureHeader(header: string): ParsedSignatureHeader {
  const fields: Record<string, string> = {};

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
    if (key && value && !(key in fields)) {
      fields[key] = value;
    }
  }

  const tRaw = fields.t;
  const t = tRaw !== undefined ? Number(tRaw) : Number.NaN;

  return {
    t: Number.isFinite(t) ? t : undefined,
    v1: fields.v1,
  };
}
