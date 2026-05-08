import { Injectable } from '@nestjs/common';
import got, {
  CacheError,
  HTTPError,
  MaxRedirectsError,
  Method,
  OptionsOfJSONResponseBody,
  OptionsOfTextResponseBody,
  ParseError,
  ReadError,
  RequestError,
  TimeoutError,
  UnsupportedProtocolError,
  UploadError,
} from 'got';
import { PinoLogger } from '../../logging';
import {
  type SafeOutboundRequestOptions,
  type SafeOutboundResponse,
  SsrfBlockedError,
  safeOutboundJsonRequest,
  safeOutboundRequest,
} from '../../utils/ssrf-url-validation';
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

type GotRequestParams = {
  url: string;
  method: Method;
  headers: Record<string, string> | undefined;
  timeout: number;
  body: unknown;
  retryOptions: object;
  httpsOptions: { rejectUnauthorized: boolean };
};

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : (v ?? '')]));
}

@Injectable()
export class HttpClientService {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async request<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const {
      url,
      method,
      headers,
      body,
      timeout = 5_000,
      responseType = 'json',
      retry,
      rejectUnauthorized = true,
      onRetry,
    } = options;

    const retriesLimit = retry?.limit ?? 0;
    const retryStatusCodes = retry?.statusCodes ?? RETRYABLE_HTTP_CODES;
    const retryErrorCodes = retry?.errorCodes ?? RETRYABLE_ERROR_CODES;

    const retryOptions = {
      limit: retriesLimit,
      methods: [method],
      statusCodes: retryStatusCodes,
      errorCodes: retryErrorCodes,
      calculateDelay: ({ attemptCount, error }: { attemptCount: number; error: RequestError }) => {
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
    };

    const httpsOptions = { rejectUnauthorized };

    try {
      if (options.enforceSsrfProtection) {
        // The safe outbound pipeline does not run through `got`, so the `retry`
        // / `onRetry` plumbing above is bypassed. Surface that explicitly so a
        // caller does not silently lose retry semantics — the JSDoc on
        // `enforceSsrfProtection` documents the same constraint.
        if ((retriesLimit ?? 0) > 0 || onRetry) {
          this.logger.warn(
            { url, method },
            'enforceSsrfProtection is enabled; retry / onRetry options are not honoured on the safe outbound path'
          );
        }

        return await this.requestSafe<T>({ url, method, headers, body, timeout, responseType, rejectUnauthorized });
      }

      if (responseType === 'text') {
        return await this.requestText<T>({ url, method, headers, timeout, body, retryOptions, httpsOptions });
      }

      return await this.requestJson<T>({ url, method, headers, timeout, body, retryOptions, httpsOptions });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private async requestSafe<T>(params: {
    url: string;
    method: Method;
    headers: Record<string, string> | undefined;
    body: unknown;
    timeout: number;
    responseType: 'json' | 'text';
    rejectUnauthorized: boolean;
  }): Promise<HttpResponse<T>> {
    const safeOptions: SafeOutboundRequestOptions = {
      url: params.url,
      method: params.method as SafeOutboundRequestOptions['method'],
      headers: params.headers,
      timeoutMs: params.timeout,
      rejectUnauthorized: params.rejectUnauthorized,
    };

    if (params.body !== undefined) {
      safeOptions.body = params.body as SafeOutboundRequestOptions['body'];
    }

    let response: SafeOutboundResponse;
    let parsedBody: unknown;

    if (params.responseType === 'text') {
      response = await safeOutboundRequest(safeOptions);
      parsedBody = response.body.toString('utf8');
    } else {
      const jsonResponse = await safeOutboundJsonRequest<T>(safeOptions);
      response = {
        statusCode: jsonResponse.statusCode,
        statusMessage: jsonResponse.statusMessage,
        headers: jsonResponse.headers,
        body: Buffer.alloc(0),
      };
      parsedBody = jsonResponse.body;
    }

    if (response.statusCode >= 400) {
      throw new HttpClientError({
        type: HttpClientErrorType.HTTP_ERROR,
        message: `Response code ${response.statusCode} (${response.statusMessage || ''})`.trim(),
        statusCode: response.statusCode,
        responseBody: parsedBody,
      });
    }

    return {
      body: parsedBody as T,
      statusCode: response.statusCode,
      headers: normalizeHeaders(response.headers as Record<string, string | string[] | undefined>),
    };
  }

  private async requestText<T>(params: GotRequestParams): Promise<HttpResponse<T>> {
    const { url, method, headers, timeout, body, retryOptions, httpsOptions } = params;
    const gotOptions: OptionsOfTextResponseBody = {
      url,
      method,
      headers,
      timeout,
      responseType: 'text',
      ...(body !== undefined ? { json: body } : {}),
      retry: retryOptions,
      https: httpsOptions,
    };

    const response = await got(gotOptions);

    return {
      body: response.body as unknown as T,
      statusCode: response.statusCode,
      headers: normalizeHeaders(response.headers),
    };
  }

  private async requestJson<T>(params: GotRequestParams): Promise<HttpResponse<T>> {
    const { url, method, headers, timeout, body, retryOptions, httpsOptions } = params;
    const gotOptions: OptionsOfJSONResponseBody = {
      url,
      method,
      headers,
      timeout,
      responseType: 'json',
      ...(body !== undefined ? { json: body } : {}),
      retry: retryOptions,
      https: httpsOptions,
    };

    const response = await got<T>(gotOptions);

    return {
      body: response.body,
      statusCode: response.statusCode,
      headers: normalizeHeaders(response.headers),
    };
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
    if (error instanceof HttpClientError) {
      return error;
    }

    if (error instanceof SsrfBlockedError) {
      return new HttpClientError({
        type: HttpClientErrorType.SSRF_BLOCKED,
        message: error.message,
        networkCode: error.reason,
        cause: error,
      });
    }

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
