import chalk from 'chalk';
import { resolveRegionUrls } from '../../dev/resolve-region-urls';
import { ResolvedAuth, WizardCommandOptions } from '../types';
import { browserDeviceAuth } from './device-auth';

export interface ResolveAuthOptions {
  /**
   * When provided, status text is forwarded to the caller (e.g. the Ink TUI)
   * instead of being printed via `console.log`. The CLI plain-text fallback
   * leaves this undefined and keeps the legacy stdout output.
   */
  onStatus?: (message: string) => void;
  /**
   * When provided, the dashboard login URL is streamed separately from
   * `onStatus` so the TUI can park it on its own static line.
   */
  onDashboardUrl?: (url: string | null) => void;
  /**
   * CLI surface identifier forwarded to the dashboard `/cli/auth` page as
   * the `name` query param. Lets the dashboard render copy tailored to the
   * caller (e.g. agent-focused wording for `novu-connect`). Defaults to
   * `novu-wizard` inside `browserDeviceAuth` when omitted.
   */
  name?: string;
  /**
   * Base URL for the browser `/cli/auth` flow. Defaults to the region's main
   * dashboard; `novu connect` passes the Connect-specific dashboard instead.
   */
  authDashboardUrl?: string;
  /**
   * Correlates CLI onboarding events with dashboard CLI auth telemetry.
   */
  onboardingSessionId?: string;
  onAuthStarted?: () => void;
  onAuthFailed?: (message: string) => void;
}

export async function resolveAuth(
  options: WizardCommandOptions,
  resolveOptions: ResolveAuthOptions = {}
): Promise<ResolvedAuth> {
  const status = (message: string, fallback: () => void) => {
    if (resolveOptions.onStatus) {
      resolveOptions.onStatus(message);

      return;
    }
    fallback();
  };
  const cliFlagSecret = options.secretKey?.trim();
  const urls = resolveRegionUrls(options.region, {
    apiUrl: options.apiUrl,
    dashboardUrl: options.dashboardUrl,
  });
  const { apiUrl, dashboardUrl } = urls;
  const authDashboardUrl = resolveOptions.authDashboardUrl ?? urls.dashboardUrl;

  if (cliFlagSecret) {
    status('Using Novu secret key from --secret-key flag.', () =>
      console.log(chalk.gray('Using Novu secret key from --secret-key flag.'))
    );

    return {
      secretKey: cliFlagSecret,
      environmentId: '',
      environmentSlug: null,
      environmentName: null,
      organizationId: null,
      apiUrl,
      dashboardUrl,
      region: options.region,
      source: 'cli-flag',
    };
  }

  /**
   * Only fall back to `NOVU_SECRET_KEY` in non-interactive shells (CI, piped
   * stdin). For interactive usage we always run the browser device-auth flow
   * so the user picks an environment explicitly — otherwise a stray env var
   * in the shell would silently target the wrong project and no UI would
   * make that visible.
   */
  const envSecret = process.env.NOVU_SECRET_KEY?.trim();
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && process.env.CI !== 'true';

  if (envSecret && !isInteractive) {
    status('Using NOVU_SECRET_KEY from environment (non-interactive shell detected).', () =>
      console.log(chalk.gray('Using NOVU_SECRET_KEY from environment (non-interactive shell detected).'))
    );

    return {
      secretKey: envSecret,
      environmentId: '',
      environmentSlug: null,
      environmentName: null,
      organizationId: null,
      apiUrl,
      dashboardUrl,
      region: options.region,
      source: 'env',
    };
  }

  if (envSecret && isInteractive) {
    status(
      'Detected NOVU_SECRET_KEY in environment — ignoring it so you can pick an environment via the dashboard. To skip the browser flow, re-run with `--secret-key $NOVU_SECRET_KEY`.',
      () =>
        console.log(
          chalk.gray(
            'Detected NOVU_SECRET_KEY in environment — ignoring it so you can pick an environment via the dashboard.\n' +
              '  To skip the browser flow, re-run with `--secret-key $NOVU_SECRET_KEY`.'
          )
        )
    );
  }

  status('Authorizing via the Novu Dashboard…', () => console.log(chalk.cyan('Authorizing via the Novu Dashboard…')));

  return browserDeviceAuth({
    apiUrl,
    dashboardUrl: authDashboardUrl,
    region: options.region,
    onStatus: resolveOptions.onStatus,
    onDashboardUrl: resolveOptions.onDashboardUrl,
    name: resolveOptions.name,
    onboardingSessionId: resolveOptions.onboardingSessionId,
    onAuthStarted: resolveOptions.onAuthStarted,
    onAuthFailed: resolveOptions.onAuthFailed,
  });
}
