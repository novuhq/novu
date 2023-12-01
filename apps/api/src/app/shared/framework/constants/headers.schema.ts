import { HeaderObject, ResponseHeaderKeysEnum } from '../types/headers.types';

export const COMMON_RESPONSE_HEADERS: Array<ResponseHeaderKeysEnum> = [
  ResponseHeaderKeysEnum.CONTENT_TYPE,
  ResponseHeaderKeysEnum.RATE_LIMIT_LIMIT,
  ResponseHeaderKeysEnum.RATE_LIMIT_REMAINING,
  ResponseHeaderKeysEnum.RATE_LIMIT_RESET,
  ResponseHeaderKeysEnum.RATE_LIMIT_POLICY,
  ResponseHeaderKeysEnum.IDEMPOTENCY_KEY,
  ResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY,
];

export const RESPONSE_HEADER_CONFIG: Record<ResponseHeaderKeysEnum, HeaderObject> = {
  [ResponseHeaderKeysEnum.CONTENT_TYPE]: {
    required: true,
    description: 'The MIME type of the response body.',
    schema: { type: 'string' },
    example: 'application/json',
  },
  [ResponseHeaderKeysEnum.RATE_LIMIT_LIMIT]: {
    required: false,
    description:
      'The number of requests that the client is permitted to make per second. The actual maximum may differ when burst is enabled.',
    schema: { type: 'string' },
    example: '100',
  },
  [ResponseHeaderKeysEnum.RATE_LIMIT_REMAINING]: {
    required: false,
    description: 'The number of requests remaining until the next window.',
    schema: { type: 'string' },
    example: '93',
  },
  [ResponseHeaderKeysEnum.RATE_LIMIT_RESET]: {
    required: false,
    description: 'The remaining seconds until a request of the same cost will be refreshed.',
    schema: { type: 'string' },
    example: '8',
  },
  [ResponseHeaderKeysEnum.RATE_LIMIT_POLICY]: {
    required: false,
    description: 'The rate limit policy that was used to evaluate the request.',
    schema: { type: 'string' },
    example: '100;w=1;burst=110;comment="token bucket";category="trigger";cost="single"',
  },
  [ResponseHeaderKeysEnum.RETRY_AFTER]: {
    required: false,
    description: 'The number of seconds after which the client may retry the request that was previously rejected.',
    schema: { type: 'string' },
    example: '8',
  },
  [ResponseHeaderKeysEnum.IDEMPOTENCY_KEY]: {
    required: false,
    description: 'The idempotency key used to evaluate the request.',
    schema: { type: 'string' },
    example: '8',
  },
  [ResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY]: {
    required: false,
    description: 'Whether the request was a replay of a previous request.',
    schema: { type: 'string' },
    example: 'true',
  },
  [ResponseHeaderKeysEnum.LINK]: {
    required: false,
    description: 'A link to the documentation.',
    schema: { type: 'string' },
    example: 'https://docs.novu.co/',
  },
};
