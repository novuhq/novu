import { CLI_DEVICE_SESSION_NAME_NOVU_CONNECT } from '@novu/shared';
import { browserDeviceAuth } from '../../wizard/auth/device-auth';
import { type ResolveAuthOptions, resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { bootstrapKeylessSession } from '../api/keyless-session';
import type { ConnectCommandOptions } from '../types';

export type ConnectAuthMethod = 'keyless' | 'secret-key-flag' | 'secret-key-env' | 'dashboard-oauth';

export interface ResolvedConnectAuth extends Omit<ResolvedAuth, 'source'> {
  source: ResolvedAuth['source'] | 'keyless';
  isKeyless: boolean;
  keylessApplicationIdentifier?: string;
}

export function resolveConnectAuthMethod(options: ConnectCommandOptions): ConnectAuthMethod {
  const cliFlagSecret = options.secretKey?.trim();
  const envSecret = process.env.NOVU_SECRET_KEY?.trim();
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && process.env.CI !== 'true';

  if (options.keyless) {
    return 'keyless';
  }

  if (cliFlagSecret) {
    return 'secret-key-flag';
  }

  if (envSecret && !isInteractive) {
    return 'secret-key-env';
  }

  return 'dashboard-oauth';
}

export async function resolveConnectAuth(
  options: ConnectCommandOptions,
  resolveOptions: ResolveAuthOptions = {}
): Promise<ResolvedConnectAuth> {
  const wantsKeyless = Boolean(options.keyless);
  const cliFlagSecret = options.secretKey?.trim();
  const method = resolveConnectAuthMethod(options);

  if (cliFlagSecret && wantsKeyless) {
    throw new Error(
      'Cannot use --keyless together with --secret-key. Omit --secret-key for keyless mode, or omit --keyless to authenticate with your account.'
    );
  }

  switch (method) {
    case 'secret-key-flag':
    case 'secret-key-env': {
      resolveOptions.onAuthStarted?.();
      const auth = await resolveAuth(toWizardAuthOptions(options), resolveOptions);

      return { ...auth, isKeyless: false };
    }
    case 'keyless': {
      resolveOptions.onStatus?.('Setting up a temporary keyless workspace…');
      resolveOptions.onAuthStarted?.();

      try {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        resolveOptions.onAuthFailed?.(message);
        throw error;
      }
    }
    case 'dashboard-oauth': {
      resolveOptions.onStatus?.('Authorizing via the Novu Dashboard…');

      const auth = await browserDeviceAuth({
        apiUrl: options.apiUrl,
        dashboardUrl: resolveOptions.authDashboardUrl ?? options.connectDashboardUrl,
        region: options.region,
        onStatus: resolveOptions.onStatus,
        onDashboardUrl: resolveOptions.onDashboardUrl,
        name: resolveOptions.name ?? CLI_DEVICE_SESSION_NAME_NOVU_CONNECT,
        onboardingSessionId: resolveOptions.onboardingSessionId,
        onAuthStarted: resolveOptions.onAuthStarted,
        onAuthFailed: resolveOptions.onAuthFailed,
      });

      return { ...auth, isKeyless: false };
    }
    default: {
      const _exhaustive: never = method;

      return _exhaustive;
    }
  }
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
