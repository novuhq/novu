import { randomBytes } from 'crypto';
import getPort from 'get-port';
import http, { IncomingMessage, ServerResponse } from 'http';
import open from 'open';
import ora from 'ora';
import type { CloudRegionEnum } from '../../dev/enums';
import { ResolvedAuth } from '../types';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export interface BrowserAuthInput {
  apiUrl: string;
  dashboardUrl: string;
  mcpUrl?: string;
  region: CloudRegionEnum;
  timeoutMs?: number;
  /**
   * When provided, status updates are forwarded here instead of being printed
   * via an `ora` spinner. The Ink TUI uses this to drive its own progress UI;
   * the plain-text fallback leaves it undefined so the spinner still renders.
   */
  onStatus?: (message: string) => void;
  /**
   * Streams the dashboard login URL to the caller separately from the spinner
   * message. The Ink TUI parks the URL on its own static line so spinner ticks
   * never re-render it (preserving the user's mouse selection). Pass `null`
   * once auth resolves to clear the line.
   */
  onDashboardUrl?: (url: string | null) => void;
  /**
   * Identifies which Novu CLI surface is initiating the auth flow. Forwarded
   * to the dashboard's `/cli/auth` page as the `name` query param so the
   * dashboard can show wording that matches the calling context (e.g.
   * agent-flavoured copy when this is `novu-connect`). Defaults to
   * `novu-wizard`.
   */
  name?: string;
}

interface CallbackPayload {
  state: string;
  apiKey: string;
  environmentId: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export async function browserDeviceAuth(input: BrowserAuthInput): Promise<ResolvedAuth> {
  const port = await getPort({ port: [54321, 54322, 54323, 0] });
  const state = randomBytes(16).toString('hex');
  const dashboardOrigin = new URL(input.dashboardUrl).origin;

  const useExternalStatus = typeof input.onStatus === 'function';
  let spinner: ReturnType<typeof ora> | undefined;
  const stopSpinner = (): void => {
    if (spinner?.isSpinning) {
      spinner.stop();
    }
    spinner = undefined;
  };

  try {
    const result = await new Promise<CallbackPayload>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Authorization timed out. Please try again.'));
        server.close();
      }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      const settle = (payload: CallbackPayload | null, error?: Error) => {
        clearTimeout(timer);
        stopSpinner();
        setImmediate(() => server.close());
        if (error) {
          reject(error);
        } else if (payload) {
          resolve(payload);
        }
      };

      const server = http.createServer((req, res) => {
        handleRequest(req, res, dashboardOrigin, state, settle);
      });

      server.on('error', (error) => {
        clearTimeout(timer);
        stopSpinner();
        reject(error);
      });

      server.listen(port, '127.0.0.1', () => {
        const callbackUrl = `http://127.0.0.1:${port}/callback`;
        const target = new URL('/cli/auth', input.dashboardUrl);
        target.searchParams.set('cli_callback', callbackUrl);
        target.searchParams.set('state', state);
        target.searchParams.set('name', input.name ?? 'novu-wizard');
        const targetUrl = target.toString();

        if (useExternalStatus) {
          input.onStatus?.('Waiting for browser authorization…');
          input.onDashboardUrl?.(targetUrl);
        } else {
          spinner = ora({
            text: `Waiting for browser authorization at ${targetUrl}`,
            discardStdin: false,
          }).start();
        }

        open(targetUrl).catch(() => {
          if (useExternalStatus) {
            input.onStatus?.("If your browser didn't open, copy the URL below.");
            input.onDashboardUrl?.(targetUrl);
          } else {
            spinner?.warn(`Open this URL in your browser to authorize: ${targetUrl}`);
          }
        });
      });
    });

    return {
      secretKey: result.apiKey,
      environmentId: result.environmentId,
      environmentSlug: result.environmentSlug ?? null,
      environmentName: result.environmentName ?? null,
      organizationId: result.organizationId ?? null,
      user: result.user ?? null,
      apiUrl: input.apiUrl,
      dashboardUrl: input.dashboardUrl,
      region: input.region,
      source: 'browser',
    };
  } finally {
    stopSpinner();
  }
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  dashboardOrigin: string,
  expectedState: string,
  done: (payload: CallbackPayload | null, error?: Error) => void
) {
  res.setHeader('Access-Control-Allow-Origin', dashboardOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

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
