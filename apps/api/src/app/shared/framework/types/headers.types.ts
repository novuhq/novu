import { ApiHeaderOptions } from '@nestjs/swagger';
import { WithRequired, testHeaderEnumValidity } from './utils.types';

export enum RequestHeaderKeysEnum {
  AUTHORIZATION = 'Authorization',
  USER_AGENT = 'User-Agent',
  GARBAGE = 'Garbage',
}

export enum ResponseHeaderKeysEnum {
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

export type HeaderObject = WithRequired<
  Omit<ApiHeaderOptions, 'name'>,
  'required' | 'description' | 'schema' | 'example'
>;
export type HeaderObjects = Record<ResponseHeaderKeysEnum, HeaderObject>;

testHeaderEnumValidity(RequestHeaderKeysEnum);
testHeaderEnumValidity(ResponseHeaderKeysEnum);
