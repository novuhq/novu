import { HeaderObject, HttpResponseHeaderKeysEnum } from '../types/headers.types';

export const COMMON_RESPONSE_HEADERS: Array<HttpResponseHeaderKeysEnum> = [
  HttpResponseHeaderKeysEnum.CONTENT_TYPE,
  HttpResponseHeaderKeysEnum.RATE_LIMIT_LIMIT,
  HttpResponseHeaderKeysEnum.RATE_LIMIT_REMAINING,
  HttpResponseHeaderKeysEnum.RATE_LIMIT_RESET,
  HttpResponseHeaderKeysEnum.RATE_LIMIT_POLICY,
  HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY,
  HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY,
];

export const RESPONSE_HEADER_CONFIG: Record<HttpResponseHeaderKeysEnum, HeaderObject> = {
  [HttpResponseHeaderKeysEnum.CONTENT_TYPE]: {
    required: true,
    description: 'The MIME type of the response body.',
    schema: { type: 'string' },
    example: 'application/json',
  },
  [HttpResponseHeaderKeysEnum.RATE_LIMIT_LIMIT]: {
    required: false,
    description:
      'The number of requests that the client is permitted to make per second. The actual maximum may differ when burst is enabled.',
    schema: { type: 'string' },
    example: '100',
  },
  [HttpResponseHeaderKeysEnum.RATE_LIMIT_REMAINING]: {
    required: false,
    description: 'The number of requests remaining until the next window.',
    schema: { type: 'string' },
    example: '93',
  },
  [HttpResponseHeaderKeysEnum.RATE_LIMIT_RESET]: {
    required: false,
    description: 'The remaining seconds until a request of the same cost will be refreshed.',
    schema: { type: 'string' },
    example: '8',
  },
  [HttpResponseHeaderKeysEnum.RATE_LIMIT_POLICY]: {
    required: false,
    description: 'The rate limit policy that was used to evaluate the request.',
    schema: { type: 'string' },
    example: '100;w=1;burst=110;comment="token bucket";category="trigger";cost="single"',
  },
  [HttpResponseHeaderKeysEnum.RETRY_AFTER]: {
    required: false,
    description: 'The number of seconds after which the client may retry the request that was previously rejected.',
    schema: { type: 'string' },
    example: '8',
  },
  [HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY]: {
    required: false,
    description: 'The idempotency key used to evaluate the request.',
    schema: { type: 'string' },
    example: '8',
  },
  [HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY]: {
    required: false,
    description: 'Whether the request was a replay of a previous request.',
    schema: { type: 'string' },
    example: 'true',
  },
  [HttpResponseHeaderKeysEnum.LINK]: {
    required: false,
    description: 'A link to the documentation.',
    schema: { type: 'string' },
    example: 'https://docs.novu.co/',
  },
};
