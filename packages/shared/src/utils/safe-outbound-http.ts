import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import { assertSafeOutboundUrl, resolvePublicAddresses, SsrfBlockedError } from './ssrf-url-validation';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export type SafeOutboundMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface SafeOutboundRequestOptions {
  /** Original request URL. Will be re-validated on every redirect. */
  url: string | URL;
  method?: SafeOutboundMethod;
  /** Headers attached to the original request. Forwarded across redirects only when the host matches. */
  headers?: Record<string, string | undefined>;
  /** Body for the request. Strings, Buffers, and Readables are supported. Objects are JSON-stringified. */
  body?: string | Buffer | Readable | object;
  /** Per-request timeout in ms (applies to each redirect hop). Default {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
  /** Maximum number of redirects to follow. Default {@link DEFAULT_MAX_REDIRECTS}. Set to 0 to disable redirects. */
  maxRedirects?: number;
  /** Maximum response size before the request is aborted. Default {@link DEFAULT_MAX_RESPONSE_BYTES}. */
  maxResponseBytes?: number;
  /** When true, disables TLS verification. Use only for development bridges. */
  rejectUnauthorized?: boolean;
}

export interface SafeOutboundResponse {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

/**
 * Result of {@link safeOutboundRequest} where the response body is parsed as JSON
 * if the content-type is JSON, otherwise it stays as a string.
 */
export interface SafeOutboundJsonResponse<T = unknown> {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  body: T;
}

/**
 * Centralized SSRF-safe HTTP client.
 *
 * Properties enforced:
 *  - URL must be http/https with no embedded credentials and no blocked hostname.
 *  - Hostname is resolved via DNS once per attempt; if **any** returned address
 *    is private/reserved/loopback/link-local/IPv4-mapped variant, the request
 *    is rejected before a TCP connection is opened.
 *  - The TCP connection is **pinned** to a validated IP. The original hostname
 *    is preserved as the `Host` header and as SNI servername.
 *  - Redirects are followed manually (never by the HTTP stack). Each `Location`
 *    target re-runs the full SSRF policy (URL validation + DNS rejection +
 *    pinning), defending against late-binding attacks.
 *  - URLs in `Location` headers cannot relocate to a different scheme that
 *    bypasses the policy.
 *
 * Throws {@link SsrfBlockedError} on policy violations.
 */
export async function safeOutboundRequest(options: SafeOutboundRequestOptions): Promise<SafeOutboundResponse> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const initialOriginHost = (() => {
    try {
      return new URL(options.url as string | URL).host.toLowerCase();
    } catch {
      return null;
    }
  })();

  let currentUrl: string | URL = options.url;
  let currentMethod: SafeOutboundMethod = options.method ?? 'GET';
  let currentBody = options.body;
  const currentHeaders = { ...(options.headers ?? {}) };

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const parsed = assertSafeOutboundUrl(currentUrl);

    // Strip any sensitive headers before crossing an origin boundary on a redirect.
    if (redirect > 0 && initialOriginHost && parsed.host.toLowerCase() !== initialOriginHost) {
      stripSensitiveHeaders(currentHeaders);
      currentBody = undefined;
    }

    const addresses = await resolvePublicAddresses(parsed.hostname);
    const chosen = addresses[0];
    if (!chosen) {
      throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${parsed.hostname}".`, {
        hostname: parsed.hostname,
      });
    }

    const response = await performPinnedRequest({
      parsed,
      address: chosen,
      method: currentMethod,
      headers: currentHeaders,
      body: currentBody,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxResponseBytes: options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      rejectUnauthorized: options.rejectUnauthorized ?? true,
    });

    const status = response.statusCode;

    if (REDIRECT_STATUS_CODES.has(status) && redirect < maxRedirects) {
      const location = headerString(response.headers.location);

      if (!location) {
        return response;
      }

      const nextUrl = new URL(location, parsed.toString());

      // 307 and 308 are method-preserving redirects: the upstream is asking us
      // to replay the original method+body against the new target. If the new
      // target is on a different origin, we cannot safely strip the body or
      // downgrade the method without changing semantics, and silently blanking
      // the body would mask the cross-origin attempt from the caller. Treat it
      // as a hard stop so the caller can decide what to do.
      if ((status === 307 || status === 308) && initialOriginHost && nextUrl.host.toLowerCase() !== initialOriginHost) {
        throw new SsrfBlockedError(
          'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT',
          `Refusing to follow ${status} redirect from ${parsed.host} to ${nextUrl.host}: method-preserving redirects across origin boundaries are not allowed.`,
          { hostname: nextUrl.hostname }
        );
      }

      currentUrl = nextUrl;

      // 303 must rewrite to GET. 301/302 historically also rewrite POST→GET in browsers; we follow that.
      if (status === 303 || ((status === 301 || status === 302) && currentMethod === 'POST')) {
        currentMethod = 'GET';
        currentBody = undefined;
      }

      continue;
    }

    return response;
  }

  throw new SsrfBlockedError('INVALID_URL', `Maximum redirect count (${maxRedirects}) exceeded.`);
}

/**
 * JSON-friendly variant. Sets Content-Type if a JSON body is provided and
 * parses JSON responses automatically.
 */
export async function safeOutboundJsonRequest<T = unknown>(
  options: SafeOutboundRequestOptions
): Promise<SafeOutboundJsonResponse<T>> {
  const isPlainObject =
    options.body !== undefined &&
    options.body !== null &&
    typeof options.body === 'object' &&
    !(options.body instanceof Buffer) &&
    !(options.body instanceof Readable);

  const headers: Record<string, string | undefined> = { ...(options.headers ?? {}) };

  if (isPlainObject && !findHeader(headers, 'content-type')) {
    headers['content-type'] = 'application/json';
  }
  if (!findHeader(headers, 'accept')) {
    headers.accept = 'application/json, text/plain, */*';
  }

  const body = isPlainObject ? JSON.stringify(options.body) : (options.body as string | Buffer | Readable | undefined);

  const response = await safeOutboundRequest({ ...options, headers, body });

  const contentType = headerString(response.headers['content-type']) ?? '';
  let parsed: unknown = response.body.toString('utf8');

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      parsed = response.body.length === 0 ? undefined : JSON.parse(response.body.toString('utf8'));
    } catch {
      // Leave parsed as string if JSON parsing fails.
    }
  } else if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // Leave parsed as string if JSON parsing fails.
      }
    }
  }

  return {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    headers: response.headers,
    body: parsed as T,
  };
}

interface PinnedRequestParams {
  parsed: URL;
  address: { address: string; family: number };
  method: SafeOutboundMethod;
  headers: Record<string, string | undefined>;
  body: SafeOutboundRequestOptions['body'];
  timeoutMs: number;
  maxResponseBytes: number;
  rejectUnauthorized: boolean;
}

function performPinnedRequest(params: PinnedRequestParams): Promise<SafeOutboundResponse> {
  const { parsed, address, method, headers, body, timeoutMs, maxResponseBytes, rejectUnauthorized } = params;
  const isHttps = parsed.protocol === 'https:';
  const transport = isHttps ? https : http;

  const requestHeaders = buildOutboundHeaders(headers, parsed, body);

  return new Promise<SafeOutboundResponse>((resolve, reject) => {
    const requestOptions: http.RequestOptions & { servername?: string; rejectUnauthorized?: boolean } = {
      protocol: parsed.protocol,
      hostname: address.address,
      family: address.family,
      port: parsed.port ? Number(parsed.port) : undefined,
      path: `${parsed.pathname || '/'}${parsed.search}`,
      method,
      headers: requestHeaders,
      timeout: timeoutMs,
    };

    if (isHttps) {
      requestOptions.servername = parsed.hostname;
      requestOptions.rejectUnauthorized = rejectUnauthorized;
    }

    const req = transport.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      let total = 0;
      let aborted = false;

      res.on('data', (chunk: Buffer) => {
        if (aborted) return;
        total += chunk.length;
        if (total > maxResponseBytes) {
          aborted = true;
          res.destroy();
          reject(new Error(`Response exceeded maximum size of ${maxResponseBytes} bytes.`));

          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (aborted) return;
        resolve({
          statusCode: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? '',
          headers: res.headers,
          body: Buffer.concat(chunks, total),
        });
      });

      res.on('error', reject);
    });

    req.on('timeout', () => {
      const timeoutError: NodeJS.ErrnoException = new Error(
        `Request to ${parsed.hostname} timed out after ${timeoutMs}ms.`
      );
      // Tag the error so callers (e.g. HttpClientService retry logic) can treat
      // socket timeouts as a retryable transport failure, matching the `got` path.
      timeoutError.code = 'ETIMEDOUT';
      req.destroy(timeoutError);
    });
    req.on('error', reject);

    if (body === undefined || body === null) {
      req.end();

      return;
    }

    if (typeof body === 'string' || body instanceof Buffer) {
      req.end(body);

      return;
    }

    if (body instanceof Readable) {
      body.pipe(req);

      return;
    }

    req.end(JSON.stringify(body));
  });
}

function buildOutboundHeaders(
  headers: Record<string, string | undefined>,
  parsed: URL,
  body: SafeOutboundRequestOptions['body']
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    out[key] = String(value);
  }

  if (!findHeader(out, 'host')) {
    out.Host = parsed.host;
  }
  if (!findHeader(out, 'accept')) {
    out.Accept = '*/*';
  }
  if (!findHeader(out, 'user-agent')) {
    out['User-Agent'] = 'novu-safe-outbound/1.0';
  }

  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      out['Content-Length'] = String(Buffer.byteLength(body));
    } else if (body instanceof Buffer) {
      out['Content-Length'] = String(body.length);
    } else if (!(body instanceof Readable)) {
      const serialized = JSON.stringify(body);
      out['Content-Length'] = String(Buffer.byteLength(serialized));
      if (!findHeader(out, 'content-type')) {
        out['Content-Type'] = 'application/json';
      }
    }
  }

  return out;
}

const SENSITIVE_HEADER_PATTERNS = [
  /^authorization$/i,
  /^cookie$/i,
  /^proxy-authorization$/i,
  /^novu-signature$/i,
  /-signature$/i,
  /-hmac/i,
];

function stripSensitiveHeaders(headers: Record<string, string | undefined>): void {
  for (const key of Object.keys(headers)) {
    if (SENSITIVE_HEADER_PATTERNS.some((re) => re.test(key))) {
      delete headers[key];
    }
  }
}

function findHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function headerString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;

  return Array.isArray(value) ? value[0] : value;
}

