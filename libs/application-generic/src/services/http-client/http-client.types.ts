export enum HttpClientErrorType {
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED_PROTOCOL = 'UNSUPPORTED_PROTOCOL',
  READ_ERROR = 'READ_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  MAX_REDIRECTS = 'MAX_REDIRECTS',
  PARSE_ERROR = 'PARSE_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CERTIFICATE_ERROR = 'CERTIFICATE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class HttpClientError extends Error {
  readonly type: HttpClientErrorType;
  readonly statusCode?: number;
  readonly responseBody?: unknown;
  readonly networkCode?: string;
  readonly cause?: unknown;

  constructor(params: {
    type: HttpClientErrorType;
    message: string;
    statusCode?: number;
    responseBody?: unknown;
    networkCode?: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.cause = params.cause;
    this.name = 'HttpClientError';
    this.type = params.type;
    this.statusCode = params.statusCode;
    this.responseBody = params.responseBody;
    this.networkCode = params.networkCode;
  }
}

export interface HttpRequestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  responseType?: 'json' | 'text';
  retry?: {
    limit: number;
    statusCodes?: number[];
    errorCodes?: string[];
  };
  rejectUnauthorized?: boolean;
  onRetry?: (params: { attemptCount: number; statusCode?: number; errorCode?: string; delay: number }) => void;
}

export interface HttpResponse<T = unknown> {
  body: T;
  statusCode: number;
  headers: Record<string, string>;
}

export const RETRYABLE_HTTP_CODES: number[] = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  503, // Service Unavailable
  504, // Gateway Timeout
  // https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-5xx-errors/
  521, // CloudFlare web server is down
  522, // CloudFlare connection timed out
  524, // CloudFlare a timeout occurred
];

export const RETRYABLE_ERROR_CODES: string[] = [
  'EAI_AGAIN', //    DNS resolution failed, retry
  'ECONNREFUSED', // Connection refused by the server
  'ECONNRESET', //   Connection was forcibly closed by a peer
  'EADDRINUSE', //   Address already in use
  'EPIPE', //        Broken pipe
  'ETIMEDOUT', //    Operation timed out
  'ENOTFOUND', //    DNS lookup failed
  'EHOSTUNREACH', // No route to host
  'ENETUNREACH', //  Network is unreachable
  'BridgeRequestTimeout',
];

export const DEFAULT_TIMEOUT = 5_000;
export const DEFAULT_RETRIES_LIMIT = 3;
