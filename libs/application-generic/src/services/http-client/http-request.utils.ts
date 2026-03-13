export type KeyValuePair = { key: string; value: string };

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

export function shouldIncludeBody(body: Record<string, unknown> | undefined, method: string): boolean {
  const methodsWithoutBody = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];

  return !!body && !methodsWithoutBody.includes(method);
}
