import { ConfigService } from '../../../services';
import { type ResolveAuthOptions, resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { bootstrapKeylessSession } from '../api/keyless-session';
import { canFallbackFromKeylessToAuth, isKeylessLimitError } from '../keyless-limit-error';
import type { ConnectCommandOptions } from '../types';

const KEYLESS_CONFIG_KEY = 'connectKeylessApplicationIdentifier' as const;
const KEYLESS_LIMIT_FALLBACK_STATUS =
  'Demo limit reached. Signing in to your Novu account so you can continue without interruption…';

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
  const isInteractive = canFallbackFromKeylessToAuth();
  const wantsAuthenticated = Boolean(cliFlagSecret || (envSecret && !isInteractive));

  if (wantsAuthenticated) {
    const auth = await resolveAuth(toWizardAuthOptions(options), resolveOptions);

    return { ...auth, isKeyless: false };
  }

  const config = new ConfigService();
  const stored = config.getValue(KEYLESS_CONFIG_KEY);

  resolveOptions.onStatus?.(stored ? 'Restoring your keyless workspace…' : 'Setting up a temporary keyless workspace…');

  try {
    const session = await bootstrapKeylessSession(options.apiUrl, stored);

    if (session.recoveredFromStaleSession) {
      resolveOptions.onStatus?.('Previous keyless session is no longer available. Starting a fresh workspace…');
    }

    config.setValue(KEYLESS_CONFIG_KEY, session.applicationIdentifier);

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
  } catch (err) {
    if (isInteractive && isKeylessLimitError(err)) {
      return fallbackToAuthenticatedConnectAuth(options, resolveOptions);
    }

    throw err;
  }
}

export async function fallbackToAuthenticatedConnectAuth(
  options: ConnectCommandOptions,
  resolveOptions: ResolveAuthOptions = {}
): Promise<ResolvedConnectAuth> {
  const config = new ConfigService();
  config.setValue(KEYLESS_CONFIG_KEY, '');

  resolveOptions.onStatus?.(KEYLESS_LIMIT_FALLBACK_STATUS);

  const auth = await resolveAuth(toWizardAuthOptions(options), resolveOptions);

  return { ...auth, isKeyless: false };
}

export function shouldFallbackFromKeylessLimit(err: unknown): boolean {
  return canFallbackFromKeylessToAuth() && isKeylessLimitError(err);
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
