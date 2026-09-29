import https from 'node:https';
import { GoogleAuth } from 'google-auth-library';

// On Cloud Run this resolves to the metadata server (runtime service account); locally to ADC.
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

export type Exchange = {
  method: string;
  url: string;
  requestBody?: unknown;
  status: number;
  ms: number;
  responseText: string;
};

let recorder: ((exchange: Exchange) => void) | undefined;

/** Smoke scripts use this to capture raw request/response pairs (no credentials are recorded). */
export function setExchangeRecorder(fn: ((exchange: Exchange) => void) | undefined): void {
  recorder = fn;
}

export async function accessToken(): Promise<string> {
  const token = await auth.getAccessToken();
  if (!token) throw new Error('google-auth-library returned no access token');

  return token;
}

export class GoogleHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, url: string) {
    super(`HTTP ${status} from ${new URL(url).pathname}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Authenticated JSON call to a Google API. Uses node:https instead of fetch because fetch (undici)
 * aborts after 300 s without headers or body bytes, and a Deep Research report streams for ~8 min.
 */
export async function googleRequest(
  method: 'GET' | 'POST',
  url: string,
  userProject: string,
  body: unknown,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  const token = await accessToken();
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const started = Date.now();

  const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'x-goog-user-project': userProject,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timed out after ${timeoutMs} ms: ${new URL(url).pathname}`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

  recorder?.({ method, url, requestBody: body, status: result.status, ms: Date.now() - started, responseText: result.text });

  return result;
}

export async function googleJson<T>(
  method: 'GET' | 'POST',
  url: string,
  userProject: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const { status, text } = await googleRequest(method, url, userProject, body, timeoutMs);
  if (status < 200 || status >= 300) throw new GoogleHttpError(status, text, url);

  return JSON.parse(text) as T;
}
