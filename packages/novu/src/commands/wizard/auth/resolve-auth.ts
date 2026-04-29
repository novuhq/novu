import chalk from 'chalk';
import { ApiUrlEnum, CloudRegionEnum, DashboardUrlEnum } from '../../dev/enums';
import { ResolvedAuth, WizardCommandOptions } from '../types';
import { browserDeviceAuth } from './device-auth';

export interface ResolveAuthOptions {
  /**
   * When provided, status text is forwarded to the caller (e.g. the Ink TUI)
   * instead of being printed via `console.log`. The CLI plain-text fallback
   * leaves this undefined and keeps the legacy stdout output.
   */
  onStatus?: (message: string) => void;
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
  const apiUrl = options.apiUrl
    ? options.apiUrl.replace(/\/$/, '')
    : options.region === CloudRegionEnum.US
      ? ApiUrlEnum.US
      : ApiUrlEnum.EU;
  const dashboardUrl = options.dashboardUrl
    ? options.dashboardUrl
    : options.region === CloudRegionEnum.US
      ? DashboardUrlEnum.US
      : options.region === CloudRegionEnum.EU
        ? DashboardUrlEnum.EU
        : DashboardUrlEnum.STAGING;

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
    dashboardUrl,
    region: options.region,
    onStatus: resolveOptions.onStatus,
  });
}
