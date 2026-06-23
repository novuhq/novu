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

interface SafeRequestParams {
  url: string;
  method: Method;
  headers: Record<string, string> | undefined;
  body: unknown;
  timeout: number;
  responseType: 'json' | 'text';
  rejectUnauthorized: boolean;
}

interface RetryConfig {
  retriesLimit: number;
  retryStatusCodes: number[];
  retryErrorCodes: string[];
  onRetry?: HttpRequestOptions['onRetry'];
}

/** A retry signal describes which condition (status or transport code) makes the failure retryable. */
type RetrySignal = { statusCode: number } | { errorCode: string };

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : (v ?? '')]));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
        // The safe outbound pipeline does not run through `got`, so `got`'s own
        // retry machinery is bypassed. We re-implement the same retry contract
        // (limit, retryable status/error codes, exponential backoff, `onRetry`)
        // directly around the SSRF-safe runner so callers keep their retry
        // semantics. SSRF policy rejections (`SsrfBlockedError`) are never
        // retried — they are deterministic and retrying cannot change them.
        return await this.requestSafeWithRetry<T>(
          { url, method, headers, body, timeout, responseType, rejectUnauthorized },
          { retriesLimit, retryStatusCodes, retryErrorCodes, onRetry }
        );
      }

      if (responseType === 'text') {
        return await this.requestText<T>({ url, method, headers, timeout, body, retryOptions, httpsOptions });
      }

      return await this.requestJson<T>({ url, method, headers, timeout, body, retryOptions, httpsOptions });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private async requestSafeWithRetry<T>(params: SafeRequestParams, retryConfig: RetryConfig): Promise<HttpResponse<T>> {
    const { retriesLimit, retryStatusCodes, retryErrorCodes, onRetry } = retryConfig;

    // `attempt` is a 1-based iteration counter: it is 1 when the initial
    // request fails (the decision point for the first retry), 2 when the first
    // retry fails, etc. This mirrors `got`'s `attemptCount` so the backoff curve
    // and `onRetry` semantics are identical to the non-SSRF path.
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.requestSafe<T>(params);
      } catch (error) {
        const signal =
          attempt <= retriesLimit ? this.getSafeRetrySignal(error, retryStatusCodes, retryErrorCodes) : null;

        if (!signal) {
          throw error;
        }

        const delay = 2 ** attempt * RETRY_BASE_INTERVAL_IN_MS;
        onRetry?.({ attemptCount: attempt, delay, ...signal });

        await sleep(delay);
      }
    }
  }

  /**
   * Decide whether a failed safe-outbound attempt is retryable. Returns the
   * matching retry signal (status or transport error code) or `null` when the
   * error must propagate. `SsrfBlockedError` carries neither a retryable status
   * code nor a transport `code`, so it always propagates.
   */
  private getSafeRetrySignal(
    error: unknown,
    retryStatusCodes: number[],
    retryErrorCodes: string[]
  ): RetrySignal | null {
    if (error instanceof HttpClientError && error.statusCode && retryStatusCodes.includes(error.statusCode)) {
      return { statusCode: error.statusCode };
    }

    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code === 'string' && retryErrorCodes.includes(code)) {
      return { errorCode: code };
    }

    return null;
  }

  private async requestSafe<T>(params: SafeRequestParams): Promise<HttpResponse<T>> {
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
      // The SSRF-safe runner does not use `got`, so its transport failures
      // surface as plain Node errors carrying an errno `code` (e.g. ETIMEDOUT,
      // ECONNRESET). Preserve that code as `networkCode` and classify timeouts
      // as TIMEOUT so callers branching on `error.type` / `error.networkCode`
      // behave identically to the `got` path.
      const networkCode = (error as NodeJS.ErrnoException | null)?.code;
      if (typeof networkCode === 'string') {
        return new HttpClientError({
          type: networkCode === 'ETIMEDOUT' ? HttpClientErrorType.TIMEOUT : HttpClientErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : String(error),
          networkCode,
          cause: error,
        });
      }

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
