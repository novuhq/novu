// The box's own API, as the dashboard calls it, and Stripe.

import * as z from 'zod';
import { fetchJson, HttpError, type JsonInit } from '../node/http.ts';
import { API } from './paths.ts';
import { vars } from './runtime.ts';

export function api<T>(path: string, schema: z.ZodType<T>, init: JsonInit = {}): Promise<T> {
  return fetchJson(`${API}${path}`, schema, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: vars.FRONT_BASE_URL ?? '', ...init.headers },
  });
}

// Whether the box's API answers `path` with 2xx.
export async function apiHas(path: string, headers: Record<string, string>): Promise<boolean> {
  try {
    await api(path, z.unknown(), { headers });

    return true;
  } catch (error) {
    if (error instanceof HttpError) return false;
    throw error;
  }
}

export function stripe<T>(path: string, schema: z.ZodType<T>, form?: Record<string, string>): Promise<T> {
  return fetchJson(`https://api.stripe.com/v1${path}`, schema, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${vars.STRIPE_API_KEY ?? ''}`, 'Stripe-Version': '2022-11-15' },
    ...(form && { form }),
  });
}
