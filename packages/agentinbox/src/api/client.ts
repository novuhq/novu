import https from 'node:https';
import { isIP } from 'node:net';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CLI_COMMAND, DEFAULT_RELAY_AGENT_IDENTIFIER } from '../config';

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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body: unknown,
    /** The network error code (`ECONNREFUSED`, ...) when the API was never reached. */
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
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

export function createApiClient(input: { apiUrl: string; secretKey?: string; keylessIdentifier?: string }): ApiClient {
  const baseURL = input.apiUrl.replace(/\/$/, '');
  const keylessIdentifier = input.keylessIdentifier?.trim();
  const isKeyless = Boolean(keylessIdentifier);

  if (!isKeyless && !input.secretKey) {
    throw new Error(`Missing credentials — run \`${CLI_COMMAND} setup\` or set INBOX_SECRET_KEY.`);
  }

  const headers: Record<string, string> = isKeyless
    ? {
        Authorization: `Keyless ${keylessIdentifier}`,
        'Novu-Application-Identifier': keylessIdentifier as string,
      }
    : { Authorization: `ApiKey ${input.secretKey}` };

  return { axios: createAxios(baseURL, headers), apiUrl: baseURL, isKeyless };
}

/** For the few endpoints that need no credentials, such as starting `login` or a keyless setup. */
export function createPublicApiClient(apiUrl: string): AxiosInstance {
  return createAxios(apiUrl.replace(/\/$/, ''));
}

/**
 * Matches the API's `AGENT_INBOX_VIA_HEADER`. Tells the API a request comes from this CLI, so reading the
 * inbox counts as a host checking it, and the dashboard can say the agent was last checked through the CLI.
 */
export const AGENT_INBOX_VIA_HEADER = 'Agent-Inbox-Via';

/** Matches Novu's `NOVU_ANALYTICS_SOURCE_HEADER`. Tells Novu's analytics the request comes from this CLI. */
export const ANALYTICS_SOURCE_HEADER = 'Novu-Analytics-Source';

function createAxios(baseURL: string, headers: Record<string, string> = {}): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { [AGENT_INBOX_VIA_HEADER]: 'cli', [ANALYTICS_SOURCE_HEADER]: 'cli', ...headers },
    timeout: 60_000,
    httpsAgent: loopbackHttpsAgent(baseURL),
  });

  // The API takes the default agent when a call names none, so its name stays out of the address.
  instance.interceptors.request.use((config) => {
    if (config.params?.agentIdentifier === DEFAULT_RELAY_AGENT_IDENTIFIER) {
      config.params = Object.fromEntries(
        Object.entries(config.params as Record<string, unknown>).filter(([name]) => name !== 'agentIdentifier')
      );
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status ?? 0;
      const method = error.config?.method?.toUpperCase() ?? 'GET';
      const url = `${method} ${baseURL}${error.config?.url ?? ''}`;
      const body = error.response?.data;
      const code = error.response ? undefined : error.code;
      const fallback =
        code === 'ECONNREFUSED' ? `Could not reach the API at ${baseURL}. Is it running?` : error.message;

      throw new ApiError(extractApiMessage(body) ?? fallback, status, url, body, code);
    }
  );

  return instance;
}

/** Unwraps Novu's `{ data: ... }` envelope (some endpoints return bare bodies). */
export function unwrap<T>(body: { data?: T } | T): T {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    const inner = (body as { data?: T }).data;
    if (inner !== undefined) return inner;
  }

  return body as T;
}
