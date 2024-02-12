import { ApiHeaderOptions } from '@nestjs/swagger';
import { WithRequired, testHttpHeaderEnumValidity } from './utils.types';

export enum HttpRequestHeaderKeysEnum {
  AUTHORIZATION = 'Authorization',
  USER_AGENT = 'User-Agent',
  CONTENT_TYPE = 'Content-Type',
  SENTRY_TRACE = 'Sentry-Trace',
}
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
