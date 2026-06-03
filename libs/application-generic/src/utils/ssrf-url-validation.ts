// IMPORTANT: this file is a hand-maintained mirror of two source modules:
//   - packages/shared/src/utils/ssrf-url-validation.ts   (URL/IP policy primitives)
//   - packages/shared/src/utils/safe-outbound-http.ts    (DNS-pinned request runner)
//
// Why duplicated rather than re-exported: libs/application-generic ships as
// CommonJS and its tsconfig uses node10 module resolution, which does not honour
// the `exports` subpath map that `packages/shared` uses to publish these
// symbols. Until the lib moves to node16/nodenext resolution, we keep an
// inlined copy so backend code has a single import path through
// `@novu/application-generic`.
//
// Drift hazard: any change to the policy regexes, blocked hostname set,
// SsrfBlockedError shape, redirect state machine, or DNS handling MUST land in
// both files. A behavioural drift test in `packages/shared` exercises both
// implementations against the same inputs to fail loudly if they ever
// diverge — see `packages/shared/src/utils/safe-outbound-http-drift.spec.ts`.
//
// New code should prefer `safeOutboundRequest` / `safeOutboundJsonRequest`,
// which enforce the policy at connect time and re-validate every redirect.

import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import { LRUCache } from 'lru-cache';

export function normalizeOutboundHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }

    return null;
  } catch {
    // Continue: scheme-less host/path (e.g. example.com/hook)
  }

  const withHttps = `https://${trimmed}`;

  try {
    const parsed = new URL(withHttps);

    if (!parsed.hostname) {
      return null;
    }

    return withHttps;
  } catch {
    return null;
  }
}

const DNS_CACHE = new LRUCache<string, dns.LookupAddress[]>({
  max: 500,
  ttl: 1000 * 60 * 5,
});

export function isPrivateIp(ip: string): boolean {
  const sharedAddressSecondOctet = '(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])';
  const privateRanges = [
    /^0\.0\.0\.0$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /* RFC6598 shared address space (100.64.0.0/10) — cloud metadata, CGNAT */
    new RegExp(`^100\\.${sharedAddressSecondOctet}\\.`),
    /^::ffff:127\./i,
    /^::ffff:10\./i,
    /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./i,
    /^::ffff:192\.168\./i,
    /^::ffff:169\.254\./i,
    new RegExp(`^::ffff:100\\.${sharedAddressSecondOctet}\\.`, 'i'),
    /^::1$/i,
    /^f[cd][0-9a-f]{2}:/i,
    /^::ffff:f[cd][0-9a-f]{2}:/i,
    /^fe[89ab][0-9a-f]:/i,
    /^::ffff:fe[89ab][0-9a-f]:/i,
  ];

  return privateRanges.some((range) => range.test(ip));
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

export type SsrfBlockReason =
  | 'INVALID_URL'
  | 'UNSUPPORTED_SCHEME'
  | 'CREDENTIALS_IN_URL'
  | 'BLOCKED_HOSTNAME'
  | 'DNS_LOOKUP_FAILED'
  | 'PRIVATE_IP'
  | 'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT';

export class SsrfBlockedError extends Error {
  readonly reason: SsrfBlockReason;
  readonly resolvedAddress?: string;
  readonly hostname?: string;

  constructor(reason: SsrfBlockReason, message: string, extra?: { resolvedAddress?: string; hostname?: string }) {
    super(message);
    this.name = 'SsrfBlockedError';
    this.reason = reason;
    this.resolvedAddress = extra?.resolvedAddress;
    this.hostname = extra?.hostname;
  }
}

export function assertSafeOutboundUrl(input: string | URL): URL {
  let parsed: URL;

  try {
    parsed = typeof input === 'string' ? new URL(input) : input;
  } catch {
    throw new SsrfBlockedError('INVALID_URL', 'Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(
      'UNSUPPORTED_SCHEME',
      `URL scheme "${parsed.protocol}" is not allowed. Only http and https are permitted.`
    );
  }

  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError('CREDENTIALS_IN_URL', 'URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError('BLOCKED_HOSTNAME', `Requests to "${hostname}" are not allowed.`, { hostname });
  }

  return parsed;
}

export async function resolvePublicAddresses(
  hostname: string,
  options: { useCache?: boolean } = {}
): Promise<dns.LookupAddress[]> {
  const lower = hostname.toLowerCase();
  let addresses: dns.LookupAddress[] | undefined;

  if (options.useCache) {
    addresses = DNS_CACHE.get(lower);
  }

  if (!addresses) {
    try {
      addresses = await dns.promises.lookup(lower, { all: true });
    } catch {
      throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${lower}".`, { hostname: lower });
    }

    if (options.useCache) {
      DNS_CACHE.set(lower, addresses);
    }
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfBlockedError(
        'PRIVATE_IP',
        `Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        { hostname: lower, resolvedAddress: address }
      );
    }
  }

  return addresses;
}

/**
 * @deprecated One-shot pre-flight check. Vulnerable to redirect chains and
 * DNS rebinding. Use `safeOutboundRequest` / `safeOutboundJsonRequest`, or
 * pass `enforceSsrfProtection: true` to `HttpClientService.request`.
 */
export async function validateUrlSsrf(url: string): Promise<string | null> {
  try {
    assertSafeOutboundUrl(url);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return err.message;
    }
    throw err;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL format.';
  }

  try {
    await resolvePublicAddresses(parsed.hostname, { useCache: true });
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return err.message;
    }
    throw err;
  }

  return null;
}

// ────── Safe outbound HTTP ──────

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export type SafeOutboundMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface SafeOutboundRequestOptions {
  url: string | URL;
  method?: SafeOutboundMethod;
  headers?: Record<string, string | undefined>;
  // Accept any JSON-serializable object (typed payloads, DTOs) plus raw bodies.
  body?: string | Buffer | Readable | object;
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseBytes?: number;
  rejectUnauthorized?: boolean;
}

export interface SafeOutboundResponse {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

export interface SafeOutboundJsonResponse<T = unknown> {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  body: T;
}

function getTestAllowList(): Set<string> {
  const raw = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
  if (!raw) return new Set<string>();

  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function resolveWithTestAllowList(hostname: string): Promise<dns.LookupAddress[]> {
  const allowList = getTestAllowList();
  if (allowList.size === 0) {
    return resolvePublicAddresses(hostname);
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname.toLowerCase(), { all: true });
  } catch {
    throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${hostname}".`, {
      hostname,
    });
  }

  for (const { address } of addresses) {
    if (allowList.has(address)) continue;
    if (isPrivateIp(address)) {
      throw new SsrfBlockedError(
        'PRIVATE_IP',
        `Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        { hostname, resolvedAddress: address }
      );
    }
  }

  return addresses;
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

    if (redirect > 0 && initialOriginHost && parsed.host.toLowerCase() !== initialOriginHost) {
      stripSensitiveHeaders(currentHeaders);
      currentBody = undefined;
    }

    const addresses = await resolveWithTestAllowList(parsed.hostname);
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
  }

  return {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    headers: response.headers,
    body: parsed as T,
  };
}
