import https from 'node:https';
import { isIP } from 'node:net';
import axios, { AxiosError, AxiosInstance } from 'axios';

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

export function extractNovuApiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (Array.isArray(obj.message)) return obj.message.join('; ');
  if (typeof obj.error === 'string') return obj.error;

  return undefined;
}

export function unwrapNovuApiData<T>(body: unknown): T {
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Unexpected Novu API response shape');
  }

  return (body as { data: T }).data;
}

export function createNovuAxios(input: {
  apiUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): AxiosInstance {
  const baseURL = input.apiUrl.replace(/\/+$/, '');

  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...input.headers,
    },
    timeout: input.timeoutMs ?? 60_000,
    httpsAgent: isLoopbackHost(baseURL) ? new https.Agent({ rejectUnauthorized: false }) : undefined,
  });
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function requestApiJson<T>(apiUrl: string, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `/v1${normalizedPath}`;
  const client = createNovuAxios({ apiUrl, headers: options.headers });
  const fullUrl = `${client.defaults.baseURL}${url}`;

  let response;
  try {
    response = await client.request({
      url,
      method: options.method ?? 'GET',
      data: options.body,
      validateStatus: () => true,
    });
  } catch (error) {
    throw new Error(formatTransportError(error, fullUrl));
  }

  if (response.status >= 400) {
    throw new Error(formatApiError(response.status, response.data, fullUrl));
  }

  try {
    return unwrapNovuApiData<T>(response.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Novu API response shape';

    throw new Error(`Novu API returned an unexpected response at ${fullUrl}: ${message}`);
  }
}

function formatApiError(status: number, body: unknown, url: string): string {
  const message = extractNovuApiMessage(body);

  if (status === 404) {
    return `Novu API endpoint not found (${url}). If you are running locally, restart the API after pulling latest changes. If you are on Novu Cloud, this CLI version may require a newer API deployment.`;
  }

  return message
    ? `Failed to reach Novu API (${status}): ${message}`
    : `Failed to reach Novu API (${status}) at ${url}`;
}

function formatTransportError(error: unknown, url: string): string {
  if (axios.isAxiosError(error)) {
    const code = (error as AxiosError & { code?: string }).code;

    if (code === 'ECONNREFUSED') {
      return `Could not reach the Novu API at ${url}. Is it running? For local dev, try \`--region local\` or \`--api-url http://localhost:3000\`.`;
    }

    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      return `Could not verify the TLS certificate for ${url}. For local dev, use \`--api-url http://localhost:3000\` or ensure the portless CA is trusted.`;
    }
  }

  const message = error instanceof Error ? error.message : String(error);

  return `Could not reach the Novu API at ${url}: ${message}`;
}
