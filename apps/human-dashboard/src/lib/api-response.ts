export type JsonBody = Record<string, unknown> | null;

export async function safeJson(response: Response): Promise<JsonBody> {
  try {
    const body = await response.json();

    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/** The API wraps every successful body in `{ data: ... }`. */
export function unwrapData<T>(body: JsonBody): T {
  return (body && 'data' in body ? body.data : body) as T;
}

/** Nest's HttpException with an object payload nests the response under `message`. */
export function readErrorCode(body: JsonBody): string | undefined {
  const message = body?.message;
  const candidate =
    typeof message === 'object' && message !== null && 'code' in message
      ? (message as { code?: unknown }).code
      : body?.code;

  return typeof candidate === 'string' ? candidate : undefined;
}

export function readErrorMessage(body: JsonBody): string | undefined {
  const message = body?.message;

  if (typeof message === 'string') {
    return message;
  }

  if (typeof message === 'object' && message !== null && 'message' in message) {
    const inner = (message as { message?: unknown }).message;

    return typeof inner === 'string' ? inner : undefined;
  }

  return undefined;
}
