import type * as z from 'zod';
import { decode } from '../shared/contracts.ts';
import { stopping } from './process.ts';

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
  readonly json?: object;
  readonly form?: Record<string, string>;
  readonly timeoutMs?: number;
}

function bodyOf({ json, form }: JsonInit): string | URLSearchParams | null {
  if (json) return JSON.stringify(json);

  return form ? new URLSearchParams(form) : null;
}

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
    body: bodyOf(init),
    signal: AbortSignal.any([stopping.signal, AbortSignal.timeout(timeoutMs)]),
  }).catch((error: Error) => {
    throw new Error(`${what}: ${error.message}`);
  });
  const text = await response.text();
  if (!response.ok) throw new HttpError(`${what} -> ${response.status}: ${text.slice(0, 300)}`, response.status);

  return decode(schema, text || 'null', `${what} answered what the box can't read`);
}
