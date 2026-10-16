// HTTP from inside the box: its own API, Clerk, Stripe, GitHub, the bridge app. Bodies of services that aren't ours
// stay loosely typed (`Json`): the box only reads a few fields of them.

import { Effect } from 'effect';
import { HttpClient, HttpClientRequest, type HttpMethod } from 'effect/http';

type Method = HttpMethod.HttpMethod;

import { RequestFailed } from './errors.ts';
import { BoxEnv } from './runtime.ts';

// biome-ignore lint/suspicious/noExplicitAny: a few fields of other services' JSON
export type Json = any;

export interface RequestInit {
  readonly method?: Method;
  readonly headers?: Record<string, string>;
  // Sent as JSON.
  readonly body?: unknown;
  // Sent as application/x-www-form-urlencoded.
  readonly form?: Record<string, string>;
}

// The answer's status and text, whatever the status; fails only when nothing answered.
export const request = Effect.fn('request')(
  function* (url: string, init: RequestInit = {}) {
    const method = init.method ?? 'GET';
    let req = HttpClientRequest.make(method)(url, { headers: init.headers ?? {} });
    if (init.body !== undefined) req = HttpClientRequest.bodyText(req, JSON.stringify(init.body), 'application/json');
    if (init.form) req = HttpClientRequest.bodyUrlParams(req, init.form);
    const response = yield* HttpClient.execute(req);
    const text = yield* response.text;

    return { status: response.status, ok: response.status >= 200 && response.status < 300, text };
  },
  Effect.mapError((error) =>
    error instanceof RequestFailed ? error : new RequestFailed({ message: String(error.message) })
  )
);

// The box's own API, as the dashboard calls it.
export const api = Effect.fn('api')(function* (path: string, init: RequestInit = {}) {
  const { vars } = yield* BoxEnv;
  const answer = yield* request(`http://127.0.0.1:3000${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: vars.FRONT_BASE_URL ?? '', ...init.headers },
  });
  if (!answer.ok)
    return yield* new RequestFailed({
      message: `${init.method ?? 'GET'} ${path} -> ${answer.status}: ${answer.text.slice(0, 300)}`,
      status: answer.status,
    });

  return (answer.text ? JSON.parse(answer.text) : null) as Json;
});

// Whether the box's API answers `path` with 2xx.
export const apiHas = (path: string, headers: Record<string, string>) =>
  api(path, { headers }).pipe(
    Effect.as(true),
    Effect.catchTag('RequestFailed', () => Effect.succeed(false))
  );

export const stripe = Effect.fn('stripe')(function* (path: string, form?: Record<string, string>) {
  const { vars } = yield* BoxEnv;
  const answer = yield* request(`https://api.stripe.com/v1${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${vars.STRIPE_API_KEY ?? ''}`, 'Stripe-Version': '2022-11-15' },
    ...(form && { form }),
  });
  const json = JSON.parse(answer.text) as Json;
  if (!answer.ok)
    return yield* new RequestFailed({
      message: `Stripe ${path} -> ${answer.status}: ${json.error?.message}`,
      status: answer.status,
    });

  return json;
});
