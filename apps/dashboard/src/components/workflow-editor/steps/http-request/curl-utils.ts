export type KeyValuePair = { key: string; value: string };

export const NOVU_SIGNATURE_HEADER_KEY = 'novu-signature';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function canMethodHaveBody(method: string): boolean {
  return METHODS_WITH_BODY.has(method.toUpperCase());
}

export function buildRawCurlString(
  url: string,
  method: string,
  headers: KeyValuePair[] | Record<string, string>,
  body: KeyValuePair[] | Record<string, unknown> | null | undefined,
  novuSignature?: string
): string {
  const headerEntries: [string, string][] = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value])
    : Object.entries(headers ?? {});

  const hasNovuSignature = headerEntries.some(([k]) => k.toLowerCase() === NOVU_SIGNATURE_HEADER_KEY);

  if (novuSignature && !hasNovuSignature) {
    headerEntries.unshift([NOVU_SIGNATURE_HEADER_KEY, novuSignature]);
  }

  const headerArgs = headerEntries.map(([k, v]) => `--header '${k}: ${v}'`).join(' \\\n');

  const canHaveBody = canMethodHaveBody(method);
  let bodyObj: Record<string, unknown> | null = null;

  if (canHaveBody) {
    if (Array.isArray(body)) {
      const pairs = body.filter((b) => b.key);

      if (pairs.length > 0) {
        bodyObj = Object.fromEntries(pairs.map(({ key, value }) => [key, value]));
      }
    } else if (body && Object.keys(body).length > 0) {
      bodyObj = body;
    }
  }

  const bodyStr = bodyObj ? `--data '${JSON.stringify(bodyObj)}'` : '';
  const parts = [`novu $ curl --location '${url || 'https://api.example.com/endpoint'}'`, headerArgs, bodyStr].filter(
    Boolean
  );

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
