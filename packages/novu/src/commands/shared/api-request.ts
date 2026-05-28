import https from 'node:https';
import axios, { AxiosError } from 'axios';
import { isLoopbackHost } from './loopback-host';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export async function requestApiJson<T>(apiUrl: string, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseURL = apiUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseURL}/v1${normalizedPath}`;

  try {
    const response = await axios.request<T>({
      url,
      method: options.method ?? 'GET',
      data: options.body,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
      httpsAgent: isLoopbackHost(baseURL) ? new https.Agent({ rejectUnauthorized: false }) : undefined,
    });

    if (response.status >= 400) {
      throw new Error(formatApiError(response.status, response.data, url));
    }

    return unwrapApiData<T>(response.data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Failed to')) {
      throw error;
    }

    throw new Error(formatTransportError(error, url));
  }
}

function formatApiError(status: number, body: unknown, url: string): string {
  const message = extractMessage(body);

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

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (Array.isArray(obj.message)) return obj.message.join('; ');
  if (typeof obj.error === 'string') return obj.error;

  return undefined;
}

function unwrapApiData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body && (body as { data?: unknown }).data !== undefined) {
    return (body as { data: T }).data;
  }

  return body as T;
}
