import { ApiHeaderOptions } from '@nestjs/swagger';
import { NOVU_PRODUCT_TYPE_HEADER } from '@novu/shared';
import { testHttpHeaderEnumValidity, WithRequired } from './utils.types';

export enum HttpRequestHeaderKeysEnum {
  AUTHORIZATION = 'Authorization',
  USER_AGENT = 'User-Agent',
  CONTENT_TYPE = 'Content-Type',
  SENTRY_TRACE = 'Sentry-Trace',
  BAGGAGE = 'Baggage',
  NOVU_ENVIRONMENT_ID = 'Novu-Environment-Id',
  NOVU_API_VERSION = 'Novu-API-Version',
  NOVU_CLIENT_VERSION = 'Novu-Client-Version',
  NOVU_USER_AGENT = 'Novu-User-Agent',
  BYPASS_TUNNEL_REMINDER = 'Bypass-Tunnel-Reminder',
  IDEMPOTENCY_KEY = 'Idempotency-Key',
  NOVU_APPLICATION_IDENTIFIER = 'Novu-Application-Identifier',
  /**
   * Identifies which Novu product (Platform vs Connect) the request originated from. Used to
   * stamp `productType` on Clerk and Mongo organizations during sync. Source of truth is
   * `NOVU_PRODUCT_TYPE_HEADER` in `@novu/shared` so the dashboard can reuse it without pulling
   * in NestJS code.
   */
  X_NOVU_PRODUCT_TYPE = 'X-Novu-Product-Type',
}

// Bidirectional compile-time guarantee that the enum value matches the shared constant. The
// template literal `${...}` coerces the nominal enum member type to its underlying string
// literal, so `AssertEqual` can compare it against the shared `as const` constant in both
// directions — neither side can drift without a TS error.
type AssertEqual<A, B> = A extends B ? (B extends A ? true : never) : never;
const _productTypeHeaderInSync: AssertEqual<
  typeof NOVU_PRODUCT_TYPE_HEADER,
  `${HttpRequestHeaderKeysEnum.X_NOVU_PRODUCT_TYPE}`
> = true;
void _productTypeHeaderInSync;
testHttpHeaderEnumValidity(HttpRequestHeaderKeysEnum);

export enum HttpResponseHeaderKeysEnum {
  CONTENT_TYPE = 'Content-Type',
  RATELIMIT_REMAINING = 'RateLimit-Remaining',
  RATELIMIT_LIMIT = 'RateLimit-Limit',
  RATELIMIT_RESET = 'RateLimit-Reset',
  RATELIMIT_POLICY = 'RateLimit-Policy',
  RETRY_AFTER = 'Retry-After',
  IDEMPOTENCY_KEY = 'Idempotency-Key',
  IDEMPOTENCY_REPLAY = 'Idempotency-Replay',
  LINK = 'Link',
}
testHttpHeaderEnumValidity(HttpResponseHeaderKeysEnum);

export type HeaderObject = WithRequired<
  Omit<ApiHeaderOptions, 'name'>,
  'required' | 'description' | 'schema' | 'example'
>;
export type HeaderObjects = Record<HttpResponseHeaderKeysEnum, HeaderObject>;
