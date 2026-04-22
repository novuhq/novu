import { randomBytes } from 'crypto';
import getPort from 'get-port';
import http, { IncomingMessage, ServerResponse } from 'http';
import open from 'open';
import ora from 'ora';
import { ResolvedAuth } from '../types';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export interface BrowserAuthInput {
  apiUrl: string;
  dashboardUrl: string;
  region: 'us' | 'eu';
  timeoutMs?: number;
}

interface CallbackPayload {
  state: string;
  apiKey: string;
  environmentId: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
}

export async function browserDeviceAuth(input: BrowserAuthInput): Promise<ResolvedAuth> {
  const port = await getPort({ port: [54321, 54322, 54323, 0] });
  const state = randomBytes(16).toString('hex');
  const dashboardOrigin = new URL(input.dashboardUrl).origin;

  const result = await new Promise<CallbackPayload>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Authorization timed out. Please try again.'));
      server.close();
    }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const server = http.createServer((req, res) => {
      handleRequest(req, res, dashboardOrigin, state, (payload, error) => {
        if (error) {
          reject(error);
        } else if (payload) {
          resolve(payload);
        }
        clearTimeout(timer);
        setImmediate(() => server.close());
      });
    });

    server.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    server.listen(port, '127.0.0.1', () => {
      const callbackUrl = `http://127.0.0.1:${port}/callback`;
      const target = new URL('/cli/auth', input.dashboardUrl);
      target.searchParams.set('cli_callback', callbackUrl);
      target.searchParams.set('state', state);
      target.searchParams.set('name', 'novu-envoy');

      const spinner = ora({
        text: `Waiting for browser authorization at ${target.toString()}`,
      }).start();

      open(target.toString()).catch(() => {
        spinner.warn(`Open this URL in your browser to authorize:\n  ${target.toString()}`);
      });

      server.once('close', () => spinner.stop());
    });
  });

  return {
    secretKey: result.apiKey,
    environmentId: result.environmentId,
    environmentSlug: result.environmentSlug ?? null,
    environmentName: result.environmentName ?? null,
    organizationId: result.organizationId ?? null,
    apiUrl: input.apiUrl,
    dashboardUrl: input.dashboardUrl,
    region: input.region,
    source: 'browser',
  };
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  dashboardOrigin: string,
  expectedState: string,
  done: (payload: CallbackPayload | null, error?: Error) => void
) {
  const origin = req.headers.origin ?? '';
  const allowOrigin = origin === dashboardOrigin ? dashboardOrigin : dashboardOrigin;

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();

    return;
  }

  if (req.method !== 'POST' || !req.url?.startsWith('/callback')) {
    res.statusCode = 404;
    res.end('Not found');

    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const raw = Buffer.concat(chunks).toString('utf8');
      const parsed = JSON.parse(raw) as CallbackPayload;

      if (!parsed?.state || parsed.state !== expectedState) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid pairing code' }));
        done(null, new Error('Invalid pairing code received from dashboard'));

        return;
      }

      if (!parsed.apiKey || !parsed.environmentId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing apiKey or environmentId' }));
        done(null, new Error('Authorization payload is incomplete'));

        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      done(parsed);
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      done(null, error instanceof Error ? error : new Error('Invalid callback payload'));
    }
  });

  req.on('error', (error) => {
    done(null, error);
  });
}
