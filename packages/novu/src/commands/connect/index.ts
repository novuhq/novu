import path from 'node:path';
import { pathToFileURL } from 'node:url';
import chalk from 'chalk';
import { AnalyticService } from '../../services/analytics.service';
import { aliasConnectSession, CONNECT_EVENTS, trackConnect } from './analytics/events';
import { resolveConnectAuthMethod } from './auth/resolve-connect-auth';
import { runConnectPipeline } from './pipeline/runner';
import type { ConnectCommandOptions } from './types';
import { createLoggingUI } from './ui/logging-ui';
import type { ConnectUI } from './ui/ui';

const analytics = new AnalyticService();

interface UiBundle {
  mountConnectUI: (params: { options: ConnectCommandOptions }) => {
    ui: ConnectUI;
    done: Promise<number>;
  };
}

// Hide the import from TypeScript's CJS transform so we can dynamically pull
// in the ESM Ink bundle at runtime without ts-node trying to require() it.
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

async function loadInkUi(): Promise<UiBundle> {
  const bundlePath = path.join(__dirname, 'ui', 'index.mjs');
  try {
    const url = pathToFileURL(bundlePath).href;

    return (await dynamicImport(url)) as UiBundle;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load Novu Connect UI bundle from ${bundlePath}. Underlying error: ${message}`);
  }
}

export async function connectCommand(options: ConnectCommandOptions, anonymousId?: string): Promise<void> {
  let resolvedUserId: string | undefined;

  const trackEvent = (event: string, data?: Record<string, unknown>) => {
    trackConnect(analytics, anonymousId, event, { ...(data ?? {}), onboardingSessionId: anonymousId }, resolvedUserId);
  };

  const onIdentityResolved = (user: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) => {
    if (!anonymousId || resolvedUserId) return;

    aliasConnectSession(analytics, anonymousId, user);
    resolvedUserId = user.id;
  };

  trackEvent(CONNECT_EVENTS.STARTED, {
    region: options.region,
    apiUrl: options.apiUrl,
    connectDashboardUrl: options.connectDashboardUrl,
    ci: !!options.ci,
    hasPrompt: !!options.prompt,
    skipSlack: !!options.skipSlack,
    keyless: !!options.keyless,
    authMethod: resolveConnectAuthMethod(options),
    channel: options.channel ?? (options.skipSlack ? 'skip' : undefined),
  });

  try {
    if (shouldUseLoggingMode(options)) {
      const ui = createLoggingUI();
      const result = await runConnectPipeline({
        options,
        ui,
        onboardingSessionId: anonymousId,
        onTrack: trackEvent,
        onIdentityResolved,
      });
      if (result.exitCode !== 0) process.exitCode = result.exitCode;
    } else {
      const { mountConnectUI } = await loadInkUi();
      const mounted = mountConnectUI({ options });
      const result = await runConnectPipeline({
        options,
        ui: mounted.ui,
        onboardingSessionId: anonymousId,
        onTrack: trackEvent,
        onIdentityResolved,
      });
      const exitCode = (await mounted.done) || result.exitCode;
      if (exitCode !== 0) process.exitCode = exitCode;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trackEvent(CONNECT_EVENTS.ERROR, { message });
    console.error(chalk.red(`Connect failed: ${message}`));
    process.exitCode = 1;
  } finally {
    await analytics.flush();
  }
}

function shouldUseLoggingMode(options: ConnectCommandOptions): boolean {
  if (options.ci) return true;
  if (process.env.NOVU_CONNECT_PLAIN === '1' || process.env.NOVU_CONNECT_PLAIN === 'true') return true;
  if (process.env.CI === 'true') return true;
  if (!process.stdout.isTTY) return true;
  if (!process.stdin.isTTY) return true;

  return false;
}
