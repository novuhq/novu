export type KeyValuePair = { key: string; value: string };
export type HttpRequestBodyControl = string | KeyValuePair[] | undefined;

export function toHeadersRecord(pairs: KeyValuePair[]): Record<string, string> {
  return pairs.reduce<Record<string, string>>((acc, { key, value }) => {
    if (key) acc[key] = value;

    return acc;
  }, {});
}

export function toBodyRecord(pairs: KeyValuePair[]): Record<string, unknown> | undefined {
  if (pairs.length === 0) return undefined;

  return pairs.reduce<Record<string, unknown>>((acc, { key, value }) => {
    if (key) acc[key] = value;

    return acc;
  }, {});
}

export function parseRawBody(raw: string): Record<string, unknown> | unknown[] {
  const parsed = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Raw body must be a JSON object or array');
  }

  return parsed as Record<string, unknown> | unknown[];
}

export function resolveHttpRequestBody(body: HttpRequestBodyControl): Record<string, unknown> | unknown[] | undefined {
  if (typeof body === 'string') {
    return body.trim() ? parseRawBody(body) : undefined;
  }

  if (Array.isArray(body)) {
    return toBodyRecord(body);
  }

  return undefined;
}

export function shouldIncludeBody(body: Record<string, unknown> | unknown[] | undefined, method: string): boolean {
  const methodsWithoutBody = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];

  return !!body && !methodsWithoutBody.includes(method);
}

export interface InvalidJsonBodyDetail {
  error: string;
  hint: string;
  bodyExcerpt?: string;
}

const BODY_EXCERPT_RADIUS = 60;

const INVALID_JSON_BODY_HINT =
  'The body is parsed as JSON after Liquid variables are rendered. A variable that resolves to an unescaped quote, a line break, or a raw object can break the surrounding JSON.';

/**
 * `jsonrepair` exposes the offset as `position`; `JSON.parse` only mentions it in the message.
 */
function extractFailurePosition(error: unknown): number | undefined {
  const { position } = (error ?? {}) as { position?: unknown };

  if (typeof position === 'number' && Number.isFinite(position)) {
    return position;
  }

  const match = error instanceof Error ? /position (\d+)/.exec(error.message) : null;

  return match ? Number(match[1]) : undefined;
}

function buildBodyExcerpt(body: HttpRequestBodyControl, position: number | undefined): string | undefined {
  if (typeof body !== 'string' || position === undefined) {
    return undefined;
  }

  const start = Math.max(0, position - BODY_EXCERPT_RADIUS);
  const end = Math.min(body.length, position + BODY_EXCERPT_RADIUS);

  return `${start > 0 ? '...' : ''}${body.slice(start, end)}${end < body.length ? '...' : ''}`;
}

/**
 * Turns a JSON parse/repair failure into something a user can act on. The parsers only report a
 * character offset into the rendered body, which nobody can locate by hand, so resolve it against
 * the body and show the surrounding text instead.
 */
export function buildInvalidJsonBodyDetail(error: unknown, body: HttpRequestBodyControl): InvalidJsonBodyDetail {
  const message = error instanceof Error ? error.message : 'Failed to parse raw JSON body';
  const bodyExcerpt = buildBodyExcerpt(body, extractFailurePosition(error));

  return {
    error: `Invalid raw JSON body: ${message}`,
    hint: INVALID_JSON_BODY_HINT,
    ...(bodyExcerpt ? { bodyExcerpt } : {}),
  };
}
