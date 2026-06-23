import { browserDeviceAuth } from '../../wizard/auth/device-auth';
import { type ResolveAuthOptions, resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { bootstrapKeylessSession } from '../api/keyless-session';
import type { ConnectCommandOptions } from '../types';

export interface ResolvedConnectAuth extends Omit<ResolvedAuth, 'source'> {
  source: ResolvedAuth['source'] | 'keyless';
  isKeyless: boolean;
  keylessApplicationIdentifier?: string;
}

export async function resolveConnectAuth(
  options: ConnectCommandOptions,
  resolveOptions: ResolveAuthOptions = {}
): Promise<ResolvedConnectAuth> {
  const cliFlagSecret = options.secretKey?.trim();
  const envSecret = process.env.NOVU_SECRET_KEY?.trim();
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && process.env.CI !== 'true';
  const wantsKeyless = Boolean(options.keyless);

  if (cliFlagSecret && wantsKeyless) {
    throw new Error(
      'Cannot use --keyless together with --secret-key. Omit --secret-key for keyless mode, or omit --keyless to authenticate with your account.'
    );
  }

  if (cliFlagSecret || (envSecret && !isInteractive && !wantsKeyless)) {
    const auth = await resolveAuth(toWizardAuthOptions(options), resolveOptions);

    return { ...auth, isKeyless: false };
  }

  if (wantsKeyless) {
    resolveOptions.onStatus?.('Setting up a temporary keyless workspace…');

    const session = await bootstrapKeylessSession(options.apiUrl);

    return {
      secretKey: '',
      environmentId: '',
      environmentSlug: null,
      environmentName: 'Keyless',
      organizationId: null,
      user: null,
      apiUrl: options.apiUrl,
      dashboardUrl: options.dashboardUrl,
      region: options.region,
      source: 'keyless',
      isKeyless: true,
      keylessApplicationIdentifier: session.applicationIdentifier,
    };
  }

  resolveOptions.onStatus?.('Authorizing via the Novu Dashboard…');

  const auth = await browserDeviceAuth({
    apiUrl: options.apiUrl,
    dashboardUrl: resolveOptions.authDashboardUrl ?? options.connectDashboardUrl,
    region: options.region,
    onStatus: resolveOptions.onStatus,
    onDashboardUrl: resolveOptions.onDashboardUrl,
    name: resolveOptions.name ?? 'novu-connect',
    onboardingSessionId: resolveOptions.onboardingSessionId,
    onAuthStarted: resolveOptions.onAuthStarted,
    onAuthFailed: resolveOptions.onAuthFailed,
  });

  return { ...auth, isKeyless: false };
}

function toWizardAuthOptions(options: ConnectCommandOptions): WizardCommandOptions {
  return {
    secretKey: options.secretKey,
    apiUrl: options.apiUrl,
    dashboardUrl: options.dashboardUrl,
    region: options.region,
    yes: false,
    ci: !!options.ci,
  };
}
