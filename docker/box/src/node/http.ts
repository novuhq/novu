import * as z from 'zod';
import { fromJson } from '../shared/contracts.ts';
import { stopping } from './process.ts';

// A non-2xx answer, for callers that tell statuses apart.
export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface JsonInit {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  // Sent as JSON.
  readonly json?: object;
  // Sent as application/x-www-form-urlencoded.
  readonly form?: Record<string, string>;
  readonly timeoutMs?: number;
}

// The answer's JSON, decoded with `schema` (an empty body as null); fails unless the status is 2xx.
export async function fetchJson<T>(url: string, schema: z.ZodType<T>, init: JsonInit = {}): Promise<T> {
  const { method = 'GET', json, form, timeoutMs = 60_000 } = init;
  const what = `${method} ${url.split('?')[0]}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...(json && { 'Content-Type': 'application/json' }),
      ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' }),
      ...init.headers,
    },
    body: json ? JSON.stringify(json) : form ? new URLSearchParams(form) : null,
    signal: AbortSignal.any([stopping.signal, AbortSignal.timeout(timeoutMs)]),
  }).catch((error: Error) => {
    throw new Error(`${what}: ${error.message}`);
  });
  const text = await response.text();
  if (!response.ok) throw new HttpError(`${what} -> ${response.status}: ${text.slice(0, 300)}`, response.status);
  const decoded = fromJson(schema).safeParse(text || 'null');
  if (!decoded.success) throw new Error(`${what} answered what the box can't read: ${z.prettifyError(decoded.error)}`);

  return decoded.data;
}
