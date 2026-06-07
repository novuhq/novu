import { ConfigService } from '../../../services';
import { resolveAuth, type ResolveAuthOptions } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { bootstrapKeylessSession } from '../api/keyless-session';
import type { ConnectCommandOptions } from '../types';

const KEYLESS_CONFIG_KEY = 'connectKeylessApplicationIdentifier' as const;

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
  const wantsAuthenticated = Boolean(cliFlagSecret || (envSecret && !isInteractive));

  if (wantsAuthenticated) {
    const auth = await resolveAuth(toWizardAuthOptions(options), resolveOptions);

    return { ...auth, isKeyless: false };
  }

  resolveOptions.onStatus?.('Setting up a temporary keyless workspace…');

  const config = new ConfigService();
  const stored = config.getValue(KEYLESS_CONFIG_KEY);
  const session = await bootstrapKeylessSession(options.apiUrl, stored);
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
