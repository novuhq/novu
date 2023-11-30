import { ApiHeaderOptions } from '@nestjs/swagger';

export enum RequestHeaderKeysEnum {
  AUTHORIZATION = 'Authorization',
  USER_AGENT = 'User-Agent',
}

export enum ResponseHeaderKeysEnum {
  CONTENT_TYPE = 'Content-Type',
  RATE_LIMIT_REMAINING = 'RateLimit-Remaining',
  RATE_LIMIT_LIMIT = 'RateLimit-Limit',
  RATE_LIMIT_RESET = 'RateLimit-Reset',
  RATE_LIMIT_POLICY = 'RateLimit-Policy',
  RETRY_AFTER = 'Retry-After',
  IDEMPOTENCY_KEY = 'Idempotency-Key',
  IDEMPOTENCY_REPLAY = 'Idempotency-Replay',
  LINK = 'Link',
}

/**
 * Make properties K in T required.
 */
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type HeaderObject = WithRequired<
  Omit<ApiHeaderOptions, 'name'>,
  'required' | 'description' | 'schema' | 'example'
>;
export type HeaderObjects = Record<ResponseHeaderKeysEnum, HeaderObject>;
