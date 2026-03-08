import { Injectable } from '@nestjs/common';
import got, {
  CacheError,
  HTTPError,
  MaxRedirectsError,
  OptionsOfJSONResponseBody,
  ParseError,
  ReadError,
  RequestError,
  TimeoutError,
  UnsupportedProtocolError,
  UploadError,
} from 'got';
import { PinoLogger } from '../../logging';
import {
  HttpClientError,
  HttpClientErrorType,
  HttpRequestOptions,
  HttpResponse,
  RETRYABLE_ERROR_CODES,
  RETRYABLE_HTTP_CODES,
} from './http-client.types';

const inTestEnv = process.env.NODE_ENV === 'test';
const RETRY_BASE_INTERVAL_IN_MS = inTestEnv ? 50 : 500;

@Injectable()
export class HttpClientService {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async request<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const { url, method, headers, body, timeout = 5_000, retry, rejectUnauthorized = true, onRetry } = options;

    const retriesLimit = retry?.limit ?? 0;
    const retryStatusCodes = retry?.statusCodes ?? RETRYABLE_HTTP_CODES;
    const retryErrorCodes = retry?.errorCodes ?? RETRYABLE_ERROR_CODES;

    const gotOptions: OptionsOfJSONResponseBody = {
      headers,
      timeout,
      responseType: 'json',
      ...(body !== undefined ? { json: body } : {}),
      retry: {
        limit: retriesLimit,
        methods: [method],
        statusCodes: retryStatusCodes,
        errorCodes: retryErrorCodes,
        calculateDelay: ({ attemptCount, error }) => {
          if (attemptCount > retriesLimit) {
            return 0;
          }

          if (error?.response?.statusCode && retryStatusCodes.includes(error.response.statusCode)) {
            const delay = 2 ** attemptCount * RETRY_BASE_INTERVAL_IN_MS;
            onRetry?.({ attemptCount, statusCode: error.response.statusCode, delay });

            return delay;
          }

          if (error?.code && retryErrorCodes.includes(error.code)) {
            const delay = 2 ** attemptCount * RETRY_BASE_INTERVAL_IN_MS;
            onRetry?.({ attemptCount, errorCode: error.code, delay });

            return delay;
          }

          return 0;
        },
      },
      https: {
        rejectUnauthorized,
      },
    };

    const requester =
      method === 'POST'
        ? got.post
        : method === 'PUT'
          ? got.put
          : method === 'DELETE'
            ? got.delete
            : method === 'PATCH'
              ? got.patch
              : got.get;

    try {
      const response = await requester<T>(url, gotOptions);

      return {
        body: response.body,
        statusCode: response.statusCode,
        headers: Object.fromEntries(
          Object.entries(response.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : (v ?? '')])
        ),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private parseResponseBody(error: RequestError): unknown {
    const body = error.response?.body;

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }

    return body ?? undefined;
  }

  private normalizeError(error: unknown): HttpClientError {
    if (!(error instanceof RequestError)) {
      return new HttpClientError({
        type: HttpClientErrorType.UNKNOWN,
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });
    }

    const responseBody = this.parseResponseBody(error);
    const statusCode = error.response?.statusCode;

    if (error instanceof TimeoutError) {
      return new HttpClientError({
        type: HttpClientErrorType.TIMEOUT,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof UnsupportedProtocolError) {
      return new HttpClientError({
        type: HttpClientErrorType.UNSUPPORTED_PROTOCOL,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof ReadError) {
      return new HttpClientError({
        type: HttpClientErrorType.READ_ERROR,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof UploadError) {
      return new HttpClientError({
        type: HttpClientErrorType.UPLOAD_ERROR,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof CacheError) {
      return new HttpClientError({
        type: HttpClientErrorType.CACHE_ERROR,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof MaxRedirectsError) {
      return new HttpClientError({
        type: HttpClientErrorType.MAX_REDIRECTS,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error instanceof ParseError) {
      return new HttpClientError({
        type: HttpClientErrorType.PARSE_ERROR,
        message: error.message,
        statusCode,
        cause: error,
      });
    }

    if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      return new HttpClientError({
        type: HttpClientErrorType.CERTIFICATE_ERROR,
        message: error.message,
        networkCode: error.code,
        cause: error,
      });
    }

    if (error instanceof HTTPError) {
      return new HttpClientError({
        type: HttpClientErrorType.HTTP_ERROR,
        message: error.message,
        statusCode,
        responseBody,
        cause: error,
      });
    }

    return new HttpClientError({
      type: HttpClientErrorType.NETWORK_ERROR,
      message: error.message,
      networkCode: error.code,
      responseBody,
      statusCode,
      cause: error,
    });
  }
}
