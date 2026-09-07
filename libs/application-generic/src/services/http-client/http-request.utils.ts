import { SECRET_MASK } from '@novu/shared';

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

/**
 * Replaces every occurrence of a secret, both raw and in the JSON-escaped form it takes once
 * rendered into a JSON body.
 */
function maskSecrets(text: string, secretValues: readonly string[]): string {
  return secretValues.filter(Boolean).reduce((masked, secret) => {
    const escaped = JSON.stringify(secret).slice(1, -1);

    return masked.split(secret).join(SECRET_MASK).split(escaped).join(SECRET_MASK);
  }, text);
}

function buildBodyExcerpt(
  body: HttpRequestBodyControl,
  position: number | undefined,
  secretValues: readonly string[]
): string | undefined {
  if (typeof body !== 'string' || position === undefined) {
    return undefined;
  }

  /**
   * Mask the whole body before slicing: masking only the excerpt would leak a partial secret
   * whenever one straddles the window boundary. Masking the prefix separately re-derives the
   * reported position within the masked body so the excerpt stays centered on the failure.
   */
  const maskedBody = maskSecrets(body, secretValues);
  const maskedPosition = maskSecrets(body.slice(0, position), secretValues).length;

  const start = Math.max(0, maskedPosition - BODY_EXCERPT_RADIUS);
  const end = Math.min(maskedBody.length, maskedPosition + BODY_EXCERPT_RADIUS);

  return `${start > 0 ? '...' : ''}${maskedBody.slice(start, end)}${end < maskedBody.length ? '...' : ''}`;
}

/**
 * Turns a JSON parse/repair failure into something a user can act on. The parsers only report a
 * character offset into the rendered body, which nobody can locate by hand, so resolve it against
 * the body and show the surrounding text instead.
 *
 * `secretValues` are masked out of the excerpt. Callers that persist the result must pass every
 * decrypted environment variable value, since execution details are readable by low-privilege
 * roles through the activity feed.
 */
export function buildInvalidJsonBodyDetail(
  error: unknown,
  body: HttpRequestBodyControl,
  secretValues: readonly string[] = []
): InvalidJsonBodyDetail {
  const message = error instanceof Error ? error.message : 'Failed to parse raw JSON body';
  const bodyExcerpt = buildBodyExcerpt(body, extractFailurePosition(error), secretValues);

  return {
    error: `Invalid raw JSON body: ${message}`,
    hint: INVALID_JSON_BODY_HINT,
    ...(bodyExcerpt ? { bodyExcerpt } : {}),
  };
}
