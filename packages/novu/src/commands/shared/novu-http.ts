import https from 'node:https';
import axios, { AxiosError, AxiosInstance } from 'axios';

export function isLoopbackHost(url: string): boolean {
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
}

export async function requestApiJson<T>(apiUrl: string, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `/v1${normalizedPath}`;
  const client = createNovuAxios({ apiUrl });

  try {
    const response = await client.request({
      url,
      method: options.method ?? 'GET',
      data: options.body,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      throw new Error(formatApiError(response.status, response.data, `${client.defaults.baseURL}${url}`));
    }

    return unwrapNovuApiData<T>(response.data);
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Failed to') || error.message.startsWith('Novu API'))) {
      throw error;
    }

    throw new Error(formatTransportError(error, `${client.defaults.baseURL}${url}`));
  }
}

function formatApiError(status: number, body: unknown, url: string): string {
  const message = extractNovuApiMessage(body);

  if (status === 404) {
    return `Novu API endpoint not found (${url}). If you are running locally, restart the API after pulling latest changes. If you are on Novu Cloud, this CLI version may require a newer API deployment.`;
  }

  return message ? `Failed to reach Novu API (${status}): ${message}` : `Failed to reach Novu API (${status}) at ${url}`;
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
