import open from 'open';
import ora from 'ora';
import { requestApiJson } from '../../shared/api-request';
import type { CloudRegionEnum } from '../../dev/enums';
import { ResolvedAuth } from '../types';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

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

interface CreateDeviceSessionResponse {
  deviceCode: string;
  expiresIn: number;
  interval: number;
}

interface PollDeviceSessionResponse {
  status: 'pending' | 'approved' | 'expired';
  expiresIn?: number;
  interval?: number;
  apiKey?: string;
  environmentId?: string;
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
  const useExternalStatus = typeof input.onStatus === 'function';
  let spinner: ReturnType<typeof ora> | undefined;
  const stopSpinner = (): void => {
    if (spinner?.isSpinning) {
      spinner.stop();
    }
    spinner = undefined;
  };

  try {
    const session = await createDeviceSession(input.apiUrl, input.name);
    const target = new URL('/cli/auth', input.dashboardUrl);
    target.searchParams.set('device_code', session.deviceCode);
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

    const pollIntervalMs = Math.max(10, session.interval * 1000);
    const approved = await pollUntilApproved({
      apiUrl: input.apiUrl,
      deviceCode: session.deviceCode,
      pollIntervalMs,
      timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    return {
      secretKey: approved.apiKey,
      environmentId: approved.environmentId,
      environmentSlug: approved.environmentSlug ?? null,
      environmentName: approved.environmentName ?? null,
      organizationId: approved.organizationId ?? null,
      user: approved.user ?? null,
      apiUrl: input.apiUrl,
      dashboardUrl: input.dashboardUrl,
      region: input.region,
      source: 'browser',
    };
  } finally {
    stopSpinner();
    input.onDashboardUrl?.(null);
  }
}

async function createDeviceSession(apiUrl: string, name?: string): Promise<CreateDeviceSessionResponse> {
  const payload = await requestApiJson<CreateDeviceSessionResponse>(apiUrl, '/cli/device-sessions', {
    method: 'POST',
    body: { name },
  });

  if (!payload?.deviceCode) {
    throw new Error('CLI authorization session response is incomplete');
  }

  return payload;
}

async function pollUntilApproved(params: {
  apiUrl: string;
  deviceCode: string;
  pollIntervalMs: number;
  timeoutMs: number;
}): Promise<Required<Pick<PollDeviceSessionResponse, 'apiKey' | 'environmentId'>> & PollDeviceSessionResponse> {
  const deadline = Date.now() + params.timeoutMs;

  while (Date.now() < deadline) {
    const payload = await requestApiJson<PollDeviceSessionResponse>(
      params.apiUrl,
      `/cli/device-sessions/${params.deviceCode}`
    );

    if (payload.status === 'approved') {
      if (!payload.apiKey || !payload.environmentId) {
        throw new Error('Authorization payload is incomplete');
      }

      return payload as Required<Pick<PollDeviceSessionResponse, 'apiKey' | 'environmentId'>> &
        PollDeviceSessionResponse;
    }

    if (payload.status === 'expired') {
      throw new Error('Authorization session expired. Please try again.');
    }

    const waitMs = Math.max(params.pollIntervalMs, (payload.interval ?? DEFAULT_POLL_INTERVAL_MS / 1000) * 1000);
    await sleep(waitMs);
  }

  throw new Error('Authorization timed out. Please try again.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
