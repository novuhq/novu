import { type ConnectApiClient, createConnectApiClient } from '../api/client';
import type { ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';
import { type ResolvedConnectAuth, resolveConnectAuth } from './resolve-connect-auth';

export interface ConnectSession {
  auth: ResolvedConnectAuth;
  client: ConnectApiClient;
}

export async function upgradeKeylessSessionToDashboardAuth(
  session: ConnectSession,
  options: ConnectCommandOptions,
  ui: ConnectUI,
  resolveOptions: {
    onboardingSessionId?: string;
    onAuthStarted?: () => void;
    onAuthFailed?: (message: string) => void;
  }
): Promise<void> {
  ui.authStatus('Daily keyless demo limit reached. Opening Novu dashboard sign-in to continue…');
  ui.authStarted();

  const auth = await resolveConnectAuth(
    { ...options, login: true },
    {
      onStatus: (message) => ui.authStatus(message),
      onDashboardUrl: (url) => ui.authDashboardUrl(url),
      name: 'novu-connect',
      authDashboardUrl: options.connectDashboardUrl,
      onboardingSessionId: resolveOptions.onboardingSessionId,
      onAuthStarted: resolveOptions.onAuthStarted,
      onAuthFailed: resolveOptions.onAuthFailed,
    }
  );

  ui.authCompleted(auth.environmentName ?? null);

  const nextClient = createConnectApiClient({
    apiUrl: auth.apiUrl,
    secretKey: auth.secretKey,
  });

  session.auth = auth;
  session.client = nextClient;
}
