import https from 'node:https';
import axios, { AxiosError, AxiosInstance } from 'axios';

export class NovuApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body: unknown
  ) {
    super(message);
    this.name = 'NovuApiError';
  }
}

export interface ConnectApiClient {
  readonly axios: AxiosInstance;
  readonly apiUrl: string;
}

export function createConnectApiClient(input: { apiUrl: string; secretKey: string }): ConnectApiClient {
  const baseURL = input.apiUrl.replace(/\/$/, '');
  const debug = process.env.NOVU_CLI_DEBUG === '1' || process.env.NOVU_CLI_DEBUG === 'true';
  const instance = axios.create({
    baseURL,
    headers: {
      Authorization: `ApiKey ${input.secretKey}`,
      'Content-Type': 'application/json',
    },
    // Generous timeout: the /agents/generate call runs an LLM and can take
    // 20–40 s for complex prompts. 60 s keeps the hang detection (so a
    // misconfigured / non-running API still surfaces an error instead of
    // spinning forever) without false-positive-failing the slow LLM calls.
    timeout: 60_000,
    // Loopback / *.localhost only: dev APIs often use self-signed TLS that Node
    // rejects. RFC-1918 LAN IPs (10.x, 192.168.x) are reachable on the same
    // network — do not disable verification for those.
    httpsAgent: isLoopbackHost(baseURL) ? new https.Agent({ rejectUnauthorized: false }) : undefined,
  });

  if (debug) {
    instance.interceptors.request.use((config) => {
      process.stderr.write(`[novu connect] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}\n`);
      if (config.data) {
        process.stderr.write(`[novu connect]   body: ${JSON.stringify(config.data).slice(0, 500)}\n`);
      }

      return config;
    });
    instance.interceptors.response.use((response) => {
      process.stderr.write(
        `[novu connect] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}\n`
      );

      return response;
    });
  }

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status ?? 0;
      const method = error.config?.method?.toUpperCase() ?? 'GET';
      const url = `${method} ${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
      const body = error.response?.data;
      const fallback =
        (error as AxiosError & { code?: string }).code === 'ECONNREFUSED'
          ? `Could not reach the Novu API at ${error.config?.baseURL}. Is it running?`
          : (error as AxiosError & { code?: string }).code === 'ECONNABORTED'
            ? `Request to ${url} timed out. Is the API healthy?`
            : error.message;
      const message = extractMessage(body) ?? fallback;
      if (debug && body) {
        process.stderr.write(`[novu connect] ! ${status} ${url}\n  ${JSON.stringify(body).slice(0, 1000)}\n`);
      }
      throw new NovuApiError(message, status, url, body);
    }
  );

  return { axios: instance, apiUrl: baseURL };
}

function isLoopbackHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);

    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('127.') ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (Array.isArray(obj.message)) return obj.message.join('; ');
  if (typeof obj.error === 'string') return obj.error;

  return undefined;
}
