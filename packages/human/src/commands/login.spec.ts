import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { HumanCliConfig } from '../config';

const startLoginRequest = vi.fn();
const checkLoginRequest = vi.fn();
const getKeylessClaimToken = vi.fn();
const hasSubscriber = vi.fn();
const loadConfig = vi.fn();
const saveConfig = vi.fn();
const openInBrowser = vi.fn();

vi.mock('../api/login', () => ({
  startLoginRequest: (...args: unknown[]) => startLoginRequest(...args),
  checkLoginRequest: (...args: unknown[]) => checkLoginRequest(...args),
  getKeylessClaimToken: (...args: unknown[]) => getKeylessClaimToken(...args),
  hasSubscriber: (...args: unknown[]) => hasSubscriber(...args),
}));

vi.mock('../config', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config')>();

  return {
    ...original,
    loadConfig: () => loadConfig(),
    saveConfig: (...args: unknown[]) => saveConfig(...args),
  };
});

vi.mock('../open-browser', () => ({ openInBrowser: (...args: unknown[]) => openInBrowser(...args) }));
vi.mock('../poll', () => ({ sleep: () => Promise.resolve() }));
vi.mock('../spinner', () => ({ startWaitIndicator: () => () => undefined }));

const { LOGIN_UNAVAILABLE_MESSAGE, runLogin, withClaimToken } = await import('./login');

const LOGIN_URL = 'https://gethuman.md/cli/login?code=device_code';

const keylessConfig: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_1' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'human_abc',
  defaultChannel: 'telegram',
};

describe('runLogin', () => {
  let stdout: MockInstance;
  const originalApiUrl = process.env.NOVU_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NOVU_API_URL;
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    loadConfig.mockReturnValue(null);
    startLoginRequest.mockResolvedValue({
      deviceCode: 'device_code',
      expiresIn: 1800,
      interval: 2,
      verificationUrl: LOGIN_URL,
    });
    checkLoginRequest.mockResolvedValueOnce({ status: 'pending', expiresIn: 1800, interval: 2 }).mockResolvedValue({
      status: 'approved',
      apiKey: 'sk_account',
      environmentId: 'dev_env',
      user: { email: 'ada@example.com' },
    });
    getKeylessClaimToken.mockResolvedValue('claim_token');
    hasSubscriber.mockResolvedValue(true);
  });

  afterEach(() => {
    stdout.mockRestore();

    if (originalApiUrl === undefined) {
      delete process.env.NOVU_API_URL;
    } else {
      process.env.NOVU_API_URL = originalApiUrl;
    }
  });

  it('logs a new user in and saves only the key', async () => {
    const result = await runLogin({});

    expect(startLoginRequest).toHaveBeenCalledWith('https://api.novu.co');
    expect(openInBrowser).toHaveBeenCalledWith(LOGIN_URL);
    expect(checkLoginRequest).toHaveBeenCalledTimes(2);
    expect(getKeylessClaimToken).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'apiKey', secretKey: 'sk_account' },
      relayAgentIdentifier: 'human-relay',
    });
    expect(result).toMatchObject({ email: 'ada@example.com', keptSetup: false });
  });

  it('keeps a keyless setup: the page gets its claim token and the identity carries over', async () => {
    loadConfig.mockReturnValue(keylessConfig);

    const result = await runLogin({});

    expect(openInBrowser).toHaveBeenCalledWith(`${LOGIN_URL}&claim=claim_token`);
    expect(hasSubscriber).toHaveBeenCalledWith(expect.anything(), 'human_abc');
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'apiKey', secretKey: 'sk_account' },
      relayAgentIdentifier: 'human-relay',
      subscriberId: 'human_abc',
      defaultChannel: 'telegram',
    });
    expect(result.keptSetup).toBe(true);
  });

  it('just logs in once the keyless setup was claimed from the link', async () => {
    loadConfig.mockReturnValue(keylessConfig);
    getKeylessClaimToken.mockResolvedValue(null);

    const result = await runLogin({});

    expect(openInBrowser).toHaveBeenCalledWith(LOGIN_URL);
    expect(result.config.subscriberId).toBe('human_abc');
  });

  it('starts over when the account does not have the contact saved on this computer', async () => {
    loadConfig.mockReturnValue(keylessConfig);
    hasSubscriber.mockResolvedValue(false);

    const result = await runLogin({});

    expect(result.keptSetup).toBe(false);
    expect(result.config).not.toHaveProperty('subscriberId');
    expect(result.config).not.toHaveProperty('defaultChannel');
  });

  it('keeps the identity when it cannot check it, since the key is only handed over once', async () => {
    loadConfig.mockReturnValue({ ...keylessConfig, auth: { mode: 'apiKey', secretKey: 'sk_old' } });
    hasSubscriber.mockRejectedValue(new Error('network down'));

    const result = await runLogin({});

    expect(result.keptSetup).toBe(true);
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ subscriberId: 'human_abc' }));
  });

  it('logs in to the saved API, and carries nothing over to another API', async () => {
    loadConfig.mockReturnValue({ ...keylessConfig, apiUrl: 'https://eu.api.novu.co' });

    await runLogin({});
    expect(startLoginRequest).toHaveBeenLastCalledWith('https://eu.api.novu.co');
    expect(getKeylessClaimToken).toHaveBeenCalledTimes(1);

    getKeylessClaimToken.mockClear();
    checkLoginRequest.mockResolvedValue({ status: 'approved', apiKey: 'sk_local', environmentId: 'dev_env' });
    const result = await runLogin({ apiUrl: 'http://localhost:3000/' });

    expect(startLoginRequest).toHaveBeenLastCalledWith('http://localhost:3000');
    expect(getKeylessClaimToken).not.toHaveBeenCalled();
    expect(result.config).not.toHaveProperty('subscriberId');
  });

  it('explains when the API has no browser login', async () => {
    startLoginRequest.mockResolvedValue({ deviceCode: 'device_code', expiresIn: 300, interval: 2 });

    await expect(runLogin({})).rejects.toThrow(LOGIN_UNAVAILABLE_MESSAGE);
    expect(openInBrowser).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('stops when the login request expires', async () => {
    checkLoginRequest.mockReset().mockResolvedValue({ status: 'expired' });

    await expect(runLogin({})).rejects.toThrow(/expired/);
    expect(saveConfig).not.toHaveBeenCalled();
  });
});

describe('withClaimToken', () => {
  it('adds the claim token next to the region the API put on the link', () => {
    expect(withClaimToken('https://gethuman.md/cli/login?code=abc&region=eu', 'tok')).toBe(
      'https://gethuman.md/cli/login?code=abc&region=eu&claim=tok'
    );
    expect(withClaimToken(LOGIN_URL, null)).toBe(LOGIN_URL);
  });
});
