import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const variation = vi.fn();
const waitForInitialization = vi.fn();
const close = vi.fn();
const init = vi.fn(() => ({ variation, waitForInitialization, close }));

vi.mock('server-only', () => ({}));
vi.mock('@launchdarkly/node-server-sdk', () => ({ init }));

/** A fresh copy of the module, so each test starts without a client. */
async function loadModule() {
  vi.resetModules();

  return import('./feature-flags');
}

describe('isFlagOn', () => {
  beforeEach(() => {
    variation.mockReset();
    waitForInitialization.mockReset().mockResolvedValue(undefined);
    init.mockClear();
    close.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('asks LaunchDarkly about the account’s organization, as the API does', async () => {
    vi.stubEnv('LAUNCH_DARKLY_SDK_KEY', 'sdk-key');
    variation.mockResolvedValue(true);
    const { isFlagOn, NEW_ONBOARDING_FLAG } = await loadModule();

    expect(await isFlagOn(NEW_ONBOARDING_FLAG, 'org-1')).toBe(true);
    expect(init).toHaveBeenCalledWith('sdk-key');
    expect(variation).toHaveBeenCalledWith(
      'IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED',
      { kind: 'multi', organization: { key: 'org-1' } },
      false
    );
  });

  it('connects once for the whole server', async () => {
    vi.stubEnv('LAUNCH_DARKLY_SDK_KEY', 'sdk-key');
    variation.mockResolvedValue(false);
    const { isFlagOn } = await loadModule();

    await isFlagOn('A_FLAG', 'org-1');
    await isFlagOn('A_FLAG', 'org-2');

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('reads as off when LaunchDarkly can’t be reached, and tries again on the next request', async () => {
    vi.stubEnv('LAUNCH_DARKLY_SDK_KEY', 'sdk-key');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    waitForInitialization.mockRejectedValueOnce(new Error('timed out'));
    variation.mockResolvedValue(true);
    const { isFlagOn } = await loadModule();

    expect(await isFlagOn('A_FLAG', 'org-1')).toBe(false);
    expect(close).toHaveBeenCalled();
    expect(await isFlagOn('A_FLAG', 'org-1')).toBe(true);
    expect(init).toHaveBeenCalledTimes(2);
  });

  it('reads as off when the flag can’t be read', async () => {
    vi.stubEnv('LAUNCH_DARKLY_SDK_KEY', 'sdk-key');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    variation.mockRejectedValue(new Error('broken'));
    const { isFlagOn } = await loadModule();

    expect(await isFlagOn('A_FLAG', 'org-1')).toBe(false);
  });

  it('reads the environment variable of the flag’s name without LaunchDarkly, as the API does', async () => {
    vi.stubEnv('LAUNCH_DARKLY_SDK_KEY', '');
    vi.stubEnv('A_FLAG', 'true');
    const { isFlagOn } = await loadModule();

    expect(await isFlagOn('A_FLAG', 'org-1')).toBe(true);
    expect(await isFlagOn('ANOTHER_FLAG', 'org-1')).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });
});
