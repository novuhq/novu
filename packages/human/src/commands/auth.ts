import { spawn } from 'node:child_process';
import axios, { type AxiosInstance } from 'axios';
import pc from 'picocolors';
import { loopbackHttpsAgent, unwrap } from '../api/client';
import { info } from '../cli-io';
import {
  configPath,
  DEFAULT_API_URL,
  DEFAULT_RELAY_AGENT_IDENTIFIER,
  type HumanCliConfig,
  loadConfig,
  saveConfig,
} from '../config';
import { sleep } from '../poll';
import { handleError } from './interact';

const HUMAN_DEVICE_SESSION_NAME = 'human';
const MAX_AUTH_POLL_MS = 60 * 60 * 1000;

interface AuthOptions {
  apiUrl?: string;
  dashboardUrl?: string;
}

interface CreateDeviceSessionResponse {
  deviceCode: string;
  expiresIn: number;
  interval: number;
}

type DeviceSessionPollResponse =
  | { status: 'pending'; expiresIn: number; interval: number }
  | { status: 'expired' }
  | {
      status: 'approved';
      apiKey: string;
      environmentId: string;
      environmentName?: string | null;
    };

const DASHBOARD_URL_BY_API_URL: Record<string, string> = {
  'https://api.novu.co': 'https://dashboard.novu.co',
  'https://eu.api.novu.co': 'https://eu.dashboard.novu.co',
  'https://api.novu-staging.co': 'https://dashboard.novu-staging.co',
  'https://api.novu.localhost': 'https://dashboard.novu.localhost',
  'http://localhost:3000': 'http://localhost:4201',
};

export function resolveAuthDashboardUrl(apiUrl: string, override?: string): string {
  const configured = override?.trim() || process.env.NOVU_DASHBOARD_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const normalizedApiUrl = apiUrl.replace(/\/+$/, '');
  const knownDashboardUrl = DASHBOARD_URL_BY_API_URL[normalizedApiUrl];
  if (knownDashboardUrl) {
    return knownDashboardUrl;
  }

  throw new Error(
    `Could not infer the Novu Dashboard URL for ${normalizedApiUrl}. Pass --dashboard-url or set NOVU_DASHBOARD_URL.`
  );
}

export async function authorizeWithDashboard(input: {
  apiUrl: string;
  dashboardUrl: string;
  timeoutMs?: number;
  openBrowser?: (url: string) => void;
  wait?: (ms: number) => Promise<void>;
}): Promise<Extract<DeviceSessionPollResponse, { status: 'approved' }>> {
  const client = createAuthClient(input.apiUrl);
  const session = await createDeviceSession(client);
  const target = new URL('/cli/auth', input.dashboardUrl);
  target.searchParams.set('device_code', session.deviceCode);
  target.searchParams.set('name', HUMAN_DEVICE_SESSION_NAME);
  const targetUrl = target.toString();

  process.stdout.write(`\nAuthorize Human in the Novu Dashboard:\n\n  ${pc.underline(targetUrl)}\n\n`);
  (input.openBrowser ?? openInBrowser)(targetUrl);

  return pollUntilApproved({
    client,
    deviceCode: session.deviceCode,
    pollIntervalMs: resolvePollIntervalMs(session.interval),
    expiresInMs: session.expiresIn * 1000,
    timeoutMs: input.timeoutMs,
    wait: input.wait ?? sleep,
  });
}

export async function authCommand(options: AuthOptions): Promise<never> {
  try {
    if (process.env.NOVU_SECRET_KEY?.trim()) {
      info('Already authenticated with NOVU_SECRET_KEY; human.json was not changed.');
      process.exit(0);
    }

    const existing = loadConfig();
    const apiUrl = (options.apiUrl ?? process.env.NOVU_API_URL ?? existing?.apiUrl ?? DEFAULT_API_URL).replace(
      /\/+$/,
      ''
    );
    const dashboardUrl = resolveAuthDashboardUrl(apiUrl, options.dashboardUrl);

    info('Opening the Novu Dashboard to authenticate...');
    const approved = await authorizeWithDashboard({ apiUrl, dashboardUrl });

    saveDashboardAuth(apiUrl, approved.apiKey, existing);

    const environment = approved.environmentName ? ` for ${approved.environmentName}` : '';
    process.stdout.write(`${pc.green('✔')} Human authenticated${environment}. Saved config to ${configPath()}.\n`);
    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

export function saveDashboardAuth(
  apiUrl: string,
  secretKey: string,
  existing: HumanCliConfig | null = loadConfig()
): void {
  saveConfig({
    ...(existing ?? {
      relayAgentIdentifier: DEFAULT_RELAY_AGENT_IDENTIFIER,
    }),
    apiUrl,
    auth: { mode: 'apiKey', secretKey },
  });
}

function createAuthClient(apiUrl: string): AxiosInstance {
  const baseURL = apiUrl.replace(/\/+$/, '');

  return axios.create({
    baseURL,
    timeout: 60_000,
    httpsAgent: loopbackHttpsAgent(baseURL),
  });
}

async function createDeviceSession(client: AxiosInstance): Promise<CreateDeviceSessionResponse> {
  const session = await postAuth<CreateDeviceSessionResponse>(client, '/v1/cli/device-sessions', {
    name: HUMAN_DEVICE_SESSION_NAME,
  });

  if (!session.deviceCode || !Number.isFinite(session.expiresIn) || !Number.isFinite(session.interval)) {
    throw new Error('CLI authorization session response is incomplete.');
  }

  return session;
}

function resolvePollIntervalMs(interval: number): number {
  if (interval < 1) {
    throw new Error('CLI authorization session response is incomplete.');
  }

  return interval * 1000;
}

async function pollUntilApproved(input: {
  client: AxiosInstance;
  deviceCode: string;
  pollIntervalMs: number;
  expiresInMs: number;
  timeoutMs?: number;
  wait: (ms: number) => Promise<void>;
}): Promise<Extract<DeviceSessionPollResponse, { status: 'approved' }>> {
  const startedAt = Date.now();
  const absoluteDeadline = startedAt + Math.min(input.timeoutMs ?? MAX_AUTH_POLL_MS, MAX_AUTH_POLL_MS);
  let deadline = Math.min(startedAt + input.expiresInMs, absoluteDeadline);

  while (Date.now() < deadline) {
    const payload = await postAuth<DeviceSessionPollResponse>(
      input.client,
      `/v1/cli/device-sessions/${encodeURIComponent(input.deviceCode)}/poll`
    );

    if (payload.status === 'approved') {
      if (!payload.apiKey || !payload.environmentId) {
        throw new Error('Authorization payload is incomplete.');
      }

      return payload;
    }

    if (payload.status === 'expired') {
      throw new Error('Authorization session expired. Run `human auth` to try again.');
    }

    if (payload.expiresIn > 0) {
      deadline = Math.min(Date.now() + payload.expiresIn * 1000, absoluteDeadline);
    }

    await input.wait(input.pollIntervalMs);
  }

  throw new Error('Authorization timed out. Run `human auth` to try again.');
}

async function postAuth<T>(client: AxiosInstance, path: string, body?: unknown): Promise<T> {
  try {
    const response = await client.post(path, body);

    return unwrap<T>(response.data);
  } catch (err) {
    if (!axios.isAxiosError(err)) {
      throw err;
    }

    const responseBody = err.response?.data;
    const message =
      responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string'
        ? responseBody.message
        : err.message;

    throw new Error(`Dashboard authentication failed: ${message}`);
  }
}

function openInBrowser(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

  try {
    spawn(command, [url], { stdio: 'ignore', detached: true })
      .on('error', () => undefined)
      .unref();
  } catch {
    // The URL is always printed as a fallback.
  }
}
