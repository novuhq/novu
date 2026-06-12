import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NovuApiError } from './api/client';
import {
  isConnectInteractive,
  isKeylessDailyGenerateLimitError,
  shouldUpgradeFromKeylessGenerateLimit,
} from './keyless-limit-errors';
import type { ConnectCommandOptions } from './types';

describe('keyless-limit-errors', () => {
  const baseOptions: ConnectCommandOptions = {
    apiUrl: 'https://api.novu.co',
    dashboardUrl: 'https://dashboard.novu.co',
    connectDashboardUrl: 'https://connect.novu.co',
    region: 'us',
  };

  it('detects the keyless daily generate limit error', () => {
    const err = new NovuApiError(
      'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.',
      429,
      'POST https://api.novu.co/v1/agents/generate',
      {}
    );

    expect(isKeylessDailyGenerateLimitError(err)).toBe(true);
  });

  it('ignores unrelated 429 errors', () => {
    const err = new NovuApiError('Too many requests', 429, 'POST https://api.novu.co/v1/agents/generate', {});

    expect(isKeylessDailyGenerateLimitError(err)).toBe(false);
  });

  it('offers dashboard auth upgrade only for interactive keyless sessions', () => {
    const err = new NovuApiError(
      'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.',
      429,
      'POST https://api.novu.co/v1/agents/generate',
      {}
    );

    expect(
      shouldUpgradeFromKeylessGenerateLimit(err, { isKeyless: true } as never, {
        ...baseOptions,
        ci: true,
      })
    ).toBe(false);

    expect(shouldUpgradeFromKeylessGenerateLimit(err, { isKeyless: false } as never, baseOptions)).toBe(false);
  });

  describe('isConnectInteractive', () => {
    let stdinIsTTY: boolean | undefined;
    let stdoutIsTTY: boolean | undefined;
    let ciEnv: string | undefined;

    beforeEach(() => {
      stdinIsTTY = process.stdin.isTTY;
      stdoutIsTTY = process.stdout.isTTY;
      ciEnv = process.env.CI;
      Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
      Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
      delete process.env.CI;
    });

    afterEach(() => {
      Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: stdinIsTTY });
      Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: stdoutIsTTY });

      if (ciEnv === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = ciEnv;
      }
    });

    it('treats TTY sessions as interactive when not in CI mode', () => {
      expect(isConnectInteractive(baseOptions)).toBe(true);
      expect(isConnectInteractive({ ...baseOptions, ci: true })).toBe(false);
    });
  });
});
