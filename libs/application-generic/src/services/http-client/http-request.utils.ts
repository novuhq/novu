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

export function shouldIncludeBody(
  body: Record<string, unknown> | unknown[] | undefined,
  method: string
): boolean {
  const methodsWithoutBody = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];

  return !!body && !methodsWithoutBody.includes(method);
}
