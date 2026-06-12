import type { ConnectApiClient } from './api/client';
import { NovuApiError } from './api/client';
import type { ConnectCommandOptions } from './types';

const KEYLESS_DAILY_GENERATE_LIMIT_SNIPPET = 'Daily agent generation limit reached';

export function isConnectInteractive(options: ConnectCommandOptions): boolean {
  if (options.ci) {
    return false;
  }

  if (process.env.CI) {
    return false;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  return true;
}

export function isKeylessDailyGenerateLimitError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) {
    return false;
  }

  if (err.status !== 429) {
    return false;
  }

  return err.message.includes(KEYLESS_DAILY_GENERATE_LIMIT_SNIPPET);
}

export function shouldUpgradeFromKeylessGenerateLimit(
  err: unknown,
  client: ConnectApiClient,
  options: ConnectCommandOptions
): boolean {
  if (!client.isKeyless) {
    return false;
  }

  if (!isConnectInteractive(options)) {
    return false;
  }

  return isKeylessDailyGenerateLimitError(err);
}
