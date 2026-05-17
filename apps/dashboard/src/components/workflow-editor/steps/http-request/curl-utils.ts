export type KeyValuePair = { key: string; value: string };
export type HttpRequestBodyValue = string | KeyValuePair[] | Record<string, unknown> | null | undefined;
export type BodyEditorMode = 'key-value' | 'raw';

export const NOVU_SIGNATURE_HEADER_KEY = 'novu-signature';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function canMethodHaveBody(method: string): boolean {
  return METHODS_WITH_BODY.has(method.toUpperCase());
}

// Escape single quotes for safe interpolation inside POSIX shell single-quoted strings.
// Single quotes cannot appear inside single-quoted strings, so we close, escape, and reopen.
export function escapeShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "'\\''");
}

export function keyValuePairsToBodyString(pairs: KeyValuePair[]): string {
  const activePairs = pairs.filter(({ key }) => key);

  if (activePairs.length === 0) {
    return '';
  }

  return JSON.stringify(Object.fromEntries(activePairs.map(({ key, value }) => [key, value])));
}

export function getRawBodyString(body: HttpRequestBodyValue): string {
  if (typeof body === 'string') {
    return body;
  }

  if (Array.isArray(body)) {
    return keyValuePairsToBodyString(body);
  }

  if (body && Object.keys(body).length > 0) {
    return JSON.stringify(body);
  }

  return '';
}

export function formatJsonBodyString(body: string): string {
  if (!body.trim()) {
    return body;
  }

  try {
    const parsed = JSON.parse(body);

    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}

export function getKeyValuePairsFromBody(body: HttpRequestBodyValue): KeyValuePair[] {
  if (Array.isArray(body)) {
    return body;
  }

  if (typeof body !== 'string' || !body.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(body);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return [];
    }

    return Object.entries(parsed)
      .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => ({ key, value: value === null ? '' : String(value) }));
  } catch {
    return [];
  }
}

function canRepresentAsKeyValuePairs(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return false;
    }

    const values = Object.values(parsed);

    return values.every((value) => value === null || ['string', 'number', 'boolean'].includes(typeof value));
  } catch {
    return false;
  }
}

export function getInitialBodyEditorMode(body: HttpRequestBodyValue): BodyEditorMode {
  if (Array.isArray(body) || !body) {
    return 'key-value';
  }

  if (typeof body !== 'string') {
    return 'key-value';
  }

  if (!body.trim()) {
    return 'key-value';
  }

  return canRepresentAsKeyValuePairs(body) ? 'key-value' : 'raw';
}

export function buildRawCurlString(
  url: string,
  method: string,
  headers: KeyValuePair[] | Record<string, string>,
  body: HttpRequestBodyValue,
  novuSignature?: string
): string {
  const headerEntries: [string, string][] = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value])
    : Object.entries(headers ?? {});

  const hasNovuSignature = headerEntries.some(([k]) => k.toLowerCase() === NOVU_SIGNATURE_HEADER_KEY);

  if (novuSignature && !hasNovuSignature) {
    headerEntries.unshift([NOVU_SIGNATURE_HEADER_KEY, novuSignature]);
  }

  const headerArgs = headerEntries
    .map(([k, v]) => `--header '${escapeShellSingleQuoted(k)}: ${escapeShellSingleQuoted(v)}'`)
    .join(' \\\n');

  const canHaveBody = canMethodHaveBody(method);
  let bodyStr = '';

  if (canHaveBody) {
    const rawBody = getRawBodyString(body);

    if (rawBody) {
      bodyStr = `--data '${escapeShellSingleQuoted(rawBody)}'`;
    }
  }
  const parts = [
    `curl --location --request '${escapeShellSingleQuoted(method.toUpperCase())}' '${escapeShellSingleQuoted(url || 'https://api.example.com/endpoint')}'`,
    headerArgs,
    bodyStr,
  ].filter(Boolean);

  return parts.join(' \\\n');
}

export function getUrlDisplay(url: string): string {
  try {
    const parsed = new URL(url);

    return parsed.hostname + parsed.pathname;
  } catch {
    return url || 'api.example.com/endpoint';
  }
}
