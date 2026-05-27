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
    // Short timeout so a misconfigured / non-running API surfaces a real error
    // instead of letting the Ink spinner hang indefinitely.
    timeout: 15_000,
  });

  if (debug) {
    instance.interceptors.request.use((config) => {
      process.stderr.write(`[novu connect] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}\n`);

      return config;
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
      throw new NovuApiError(message, status, url, body);
    }
  );

  return { axios: instance, apiUrl: baseURL };
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (Array.isArray(obj.message)) return obj.message.join('; ');
  if (typeof obj.error === 'string') return obj.error;

  return undefined;
}
