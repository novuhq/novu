import https from 'node:https';
import { isIP } from 'node:net';
import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * Local dev proxies (portless `*.localhost`, plain localhost) present
 * self-signed certificates; loopback traffic never leaves the machine, so
 * verification is safely skipped for those hosts only (same behavior as the
 * `novu` CLI).
 */
export function isLoopbackHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return true;
    }

    if (hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    if (isIP(hostname) === 4) {
      return hostname.startsWith('127.');
    }

    return false;
  } catch {
    return false;
  }
}

export function loopbackHttpsAgent(url: string): https.Agent | undefined {
  return isLoopbackHost(url) ? new https.Agent({ rejectUnauthorized: false }) : undefined;
}

export class HumanApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body: unknown
  ) {
    super(message);
    this.name = 'HumanApiError';
  }
}

export interface HumanApiClient {
  readonly axios: AxiosInstance;
  readonly apiUrl: string;
  readonly isKeyless: boolean;
}

function extractApiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join('; ');

  return undefined;
}

export function createHumanApiClient(input: {
  apiUrl: string;
  secretKey?: string;
  keylessIdentifier?: string;
}): HumanApiClient {
  const baseURL = input.apiUrl.replace(/\/$/, '');
  const keylessIdentifier = input.keylessIdentifier?.trim();
  const isKeyless = Boolean(keylessIdentifier);

  if (!isKeyless && !input.secretKey) {
    throw new Error('Missing credentials — run `npx @novu/human setup` or set NOVU_SECRET_KEY.');
  }

  const headers = isKeyless
    ? {
        Authorization: `Keyless ${keylessIdentifier}`,
        'Novu-Application-Identifier': keylessIdentifier as string,
      }
    : { Authorization: `ApiKey ${input.secretKey}` };

  const instance = axios.create({ baseURL, headers, timeout: 60_000, httpsAgent: loopbackHttpsAgent(baseURL) });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status ?? 0;
      const method = error.config?.method?.toUpperCase() ?? 'GET';
      const url = `${method} ${baseURL}${error.config?.url ?? ''}`;
      const body = error.response?.data;
      const fallback =
        (error as AxiosError & { code?: string }).code === 'ECONNREFUSED'
          ? `Could not reach the Novu API at ${baseURL}. Is it running?`
          : error.message;

      throw new HumanApiError(extractApiMessage(body) ?? fallback, status, url, body);
    }
  );

  return { axios: instance, apiUrl: baseURL, isKeyless };
}

/** Unwraps Novu's `{ data: ... }` envelope (some endpoints return bare bodies). */
export function unwrap<T>(body: { data?: T } | T): T {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    const inner = (body as { data?: T }).data;
    if (inner !== undefined) return inner;
  }

  return body as T;
}
