import { AxiosError, AxiosInstance } from 'axios';
import { createNovuAxios, extractNovuApiMessage } from '../../shared/novu-http';

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
  readonly isKeyless: boolean;
}

export function createConnectApiClient(input: {
  apiUrl: string;
  secretKey?: string;
  keylessApplicationIdentifier?: string;
}): ConnectApiClient {
  const baseURL = input.apiUrl.replace(/\/$/, '');
  const debug = process.env.NOVU_CLI_DEBUG === '1' || process.env.NOVU_CLI_DEBUG === 'true';
  const keylessIdentifier = input.keylessApplicationIdentifier?.trim();
  const isKeyless = Boolean(keylessIdentifier);

  if (!isKeyless && !input.secretKey) {
    throw new Error('createConnectApiClient requires either a secretKey or a keylessApplicationIdentifier.');
  }

  const authHeaders = isKeyless
    ? {
        Authorization: `Keyless ${keylessIdentifier}`,
        'Novu-Application-Identifier': keylessIdentifier as string,
      }
    : {
        Authorization: `ApiKey ${input.secretKey}`,
      };

  const instance = createNovuAxios({
    apiUrl: baseURL,
    headers: authHeaders,
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
      const message = extractNovuApiMessage(body) ?? fallback;
      if (debug && body) {
        process.stderr.write(`[novu connect] ! ${status} ${url}\n  ${JSON.stringify(body).slice(0, 1000)}\n`);
      }
      throw new NovuApiError(message, status, url, body);
    }
  );

  return { axios: instance, apiUrl: baseURL, isKeyless };
}
