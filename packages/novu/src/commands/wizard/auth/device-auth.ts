import {
  CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
  CLI_DEVICE_SESSION_NAME_NOVU_CONNECT,
  type CliDeviceSessionPollResponse,
  type CreateCliDeviceSessionResponse,
} from '@novu/shared';
import open from 'open';
import ora from 'ora';
import type { CloudRegionEnum } from '../../dev/enums';
import { requestApiJson } from '../../shared/novu-http';
import { ResolvedAuth } from '../types';

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
  /**
   * Correlates CLI onboarding events with dashboard CLI auth telemetry.
   * Forwarded as `onboarding_session_id` on the `/cli/auth` URL.
   */
  onboardingSessionId?: string;
  /**
   * Called when browser auth begins (URL opened / poll started).
   */
  onAuthStarted?: () => void;
  /**
   * Called when browser auth fails before credentials are returned.
   */
  onAuthFailed?: (message: string) => void;
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
    if (input.onboardingSessionId) {
      target.searchParams.set('onboarding_session_id', input.onboardingSessionId);
    }
    const targetUrl = target.toString();

    input.onAuthStarted?.();

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

    const pollIntervalMs = resolvePollIntervalMs(session.interval);
    const maxPollMs =
      input.name === CLI_DEVICE_SESSION_NAME_NOVU_CONNECT
        ? CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS * 1000
        : session.expiresIn * 1000;
    let approved: Extract<CliDeviceSessionPollResponse, { status: 'approved' }>;
    try {
      approved = await pollUntilApproved({
        apiUrl: input.apiUrl,
        deviceCode: session.deviceCode,
        pollIntervalMs,
        timeoutMs: input.timeoutMs ?? session.expiresIn * 1000,
        maxPollMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      input.onAuthFailed?.(message);
      throw err;
    }

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

async function createDeviceSession(apiUrl: string, name?: string): Promise<CreateCliDeviceSessionResponse> {
  const payload = await requestApiJson<CreateCliDeviceSessionResponse>(apiUrl, '/cli/device-sessions', {
    method: 'POST',
    body: { name },
  });

  if (!payload?.deviceCode) {
    throw new Error('CLI authorization session response is incomplete');
  }

  return payload;
}

function resolvePollIntervalMs(interval: number): number {
  if (!Number.isFinite(interval) || interval < 1) {
    throw new Error('CLI authorization session response is incomplete');
  }

  return interval * 1000;
}

async function pollUntilApproved(params: {
  apiUrl: string;
  deviceCode: string;
  pollIntervalMs: number;
  timeoutMs: number;
  maxPollMs: number;
}): Promise<Extract<CliDeviceSessionPollResponse, { status: 'approved' }>> {
  const startedAt = Date.now();
  const absoluteDeadline = startedAt + params.maxPollMs;
  let deadline = Math.min(startedAt + params.timeoutMs, absoluteDeadline);

  while (Date.now() < deadline) {
    const payload = await requestApiJson<CliDeviceSessionPollResponse>(
      params.apiUrl,
      `/cli/device-sessions/${encodeURIComponent(params.deviceCode)}/poll`,
      { method: 'POST' }
    );

    if (payload.status === 'approved') {
      if (!payload.apiKey || !payload.environmentId) {
        throw new Error('Authorization payload is incomplete');
      }

      return payload;
    }

    if (payload.status === 'expired') {
      throw new Error('Authorization session expired. Please try again.');
    }

    if (payload.status === 'pending' && payload.expiresIn > 0) {
      deadline = Math.min(Date.now() + payload.expiresIn * 1000, absoluteDeadline);
    }

    await sleep(params.pollIntervalMs);
  }

  throw new Error('Authorization timed out. Please try again.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
