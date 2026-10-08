import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { HumanCliConfig } from '../config';

const startLoginRequest = vi.fn();
const checkLoginRequest = vi.fn();
const getKeylessClaimToken = vi.fn();
const hasSubscriber = vi.fn();
const findOperator = vi.fn();
const setupHumanRelay = vi.fn();
const loadConfig = vi.fn();
const saveConfig = vi.fn();
const openInBrowser = vi.fn();
const hostname = vi.fn();

vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  hostname: () => hostname(),
}));

vi.mock('../api/login', () => ({
  startLoginRequest: (...args: unknown[]) => startLoginRequest(...args),
  checkLoginRequest: (...args: unknown[]) => checkLoginRequest(...args),
  getKeylessClaimToken: (...args: unknown[]) => getKeylessClaimToken(...args),
  hasSubscriber: (...args: unknown[]) => hasSubscriber(...args),
  findOperator: (...args: unknown[]) => findOperator(...args),
}));

vi.mock('../api/human', () => ({
  setupHumanRelay: (...args: unknown[]) => setupHumanRelay(...args),
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

const {
  describeNextStep,
  introduceYourself,
  LOGIN_DENIED_MESSAGE,
  LOGIN_UNAVAILABLE_MESSAGE,
  runLogin,
  withClaimToken,
} = await import('./login');

const LOGIN_URL = 'https://gethuman.md/cli/login?code=BCDF-GHJK';
/** What APIs from before the page showed the code send: the operator types it there. */
const LOGIN_URL_WITHOUT_CODE = 'https://gethuman.md/cli/login';

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
    hostname.mockReturnValue('adas-macbook-pro');
    startLoginRequest.mockResolvedValue({
      deviceCode: 'device_code',
      expiresIn: 1800,
      interval: 2,
      verificationUrl: LOGIN_URL,
      userCode: 'BCDF-GHJK',
    });
    checkLoginRequest.mockResolvedValueOnce({ status: 'pending', expiresIn: 1800, interval: 2 }).mockResolvedValue({
      status: 'approved',
      apiKey: 'sk_account',
      environmentId: 'dev_env',
      user: { email: 'ada@example.com' },
    });
    getKeylessClaimToken.mockResolvedValue('claim_token');
    hasSubscriber.mockResolvedValue(true);
    // An account nobody set up yet has no contact for its owner.
    findOperator.mockResolvedValue(undefined);
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

    // The page names this computer next to the code.
    expect(startLoginRequest).toHaveBeenCalledWith('https://api.novu.co', 'adas-macbook-pro');
    expect(openInBrowser).toHaveBeenCalledWith(LOGIN_URL);
    // The page shows the same code to compare; the device code the CLI polls with is never printed.
    const printed = stdout.mock.calls.map(([text]) => String(text)).join('');
    expect(printed).toContain('Approve there only if the page shows this code:');
    expect(printed).toContain('BCDF-GHJK');
    expect(printed).not.toContain('device_code');
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

  it('saves the contact the account has for its owner as who agents reach by default', async () => {
    findOperator.mockResolvedValue('human_owner');

    const result = await runLogin({});

    // Made on the dashboard or another computer. No default channel: the API uses that person's own.
    expect(findOperator).toHaveBeenCalledTimes(1);
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'apiKey', secretKey: 'sk_account' },
      relayAgentIdentifier: 'human-relay',
      subscriberId: 'human_owner',
    });
    expect(result.keptSetup).toBe(false);
  });

  it('keeps the saved contact and its default channel when that is the account owner', async () => {
    loadConfig.mockReturnValue(keylessConfig);
    findOperator.mockResolvedValue('human_abc');

    const result = await runLogin({});

    expect(result.keptSetup).toBe(true);
    expect(result.config).toMatchObject({ subscriberId: 'human_abc', defaultChannel: 'telegram' });
    // The account already said who the owner is, so there is nothing left to check.
    expect(hasSubscriber).not.toHaveBeenCalled();
  });

  it('lets the account owner win over another contact saved on this computer', async () => {
    loadConfig.mockReturnValue(keylessConfig);
    findOperator.mockResolvedValue('human_owner');

    const result = await runLogin({});

    expect(result.keptSetup).toBe(false);
    expect(result.config.subscriberId).toBe('human_owner');
    // The default saved here was the other contact's.
    expect(result.config).not.toHaveProperty('defaultChannel');
  });

  it('still logs in when the account cannot say who its owner is', async () => {
    findOperator.mockRejectedValue(new Error('network down'));

    const result = await runLogin({});

    // The key is handed over only once, so it is saved either way.
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'apiKey', secretKey: 'sk_account' },
      relayAgentIdentifier: 'human-relay',
    });
    expect(result.keptSetup).toBe(false);
  });

  it('passes on the name of the Human account, for asking who you are', async () => {
    checkLoginRequest.mockReset().mockResolvedValue({
      status: 'approved',
      apiKey: 'sk_account',
      environmentId: 'dev_env',
      user: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
    });
    expect((await runLogin({})).name).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });

    checkLoginRequest
      .mockReset()
      .mockResolvedValue({ status: 'approved', apiKey: 'sk_account', environmentId: 'dev_env' });
    expect(await runLogin({})).not.toHaveProperty('name');
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
    expect(startLoginRequest).toHaveBeenLastCalledWith('https://eu.api.novu.co', 'adas-macbook-pro');
    expect(getKeylessClaimToken).toHaveBeenCalledTimes(1);

    getKeylessClaimToken.mockClear();
    checkLoginRequest.mockResolvedValue({ status: 'approved', apiKey: 'sk_local', environmentId: 'dev_env' });
    const result = await runLogin({ apiUrl: 'http://localhost:3000/' });

    expect(startLoginRequest).toHaveBeenLastCalledWith('http://localhost:3000', 'adas-macbook-pro');
    expect(getKeylessClaimToken).not.toHaveBeenCalled();
    expect(result.config).not.toHaveProperty('subscriberId');
  });

  it('explains when the API has no browser login', async () => {
    startLoginRequest.mockResolvedValue({ deviceCode: 'device_code', expiresIn: 300, interval: 2 });
    await expect(runLogin({})).rejects.toThrow(LOGIN_UNAVAILABLE_MESSAGE);

    // An API that still puts the device code in the link, without a code to type, isn't used either.
    startLoginRequest.mockResolvedValue({
      deviceCode: 'device_code',
      expiresIn: 300,
      interval: 2,
      verificationUrl: `${LOGIN_URL_WITHOUT_CODE}?code=device_code`,
    });
    await expect(runLogin({})).rejects.toThrow(LOGIN_UNAVAILABLE_MESSAGE);

    expect(openInBrowser).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('asks to type the code when the API sends a link without it', async () => {
    startLoginRequest.mockResolvedValue({
      deviceCode: 'device_code',
      expiresIn: 1800,
      interval: 2,
      verificationUrl: LOGIN_URL_WITHOUT_CODE,
      userCode: 'BCDF-GHJK',
    });

    await runLogin({});

    expect(openInBrowser).toHaveBeenCalledWith(LOGIN_URL_WITHOUT_CODE);
    expect(stdout.mock.calls.map(([text]) => String(text)).join('')).toContain('Enter this code there:');
  });

  it('sends a long computer name cut short, and none when the system has none', async () => {
    hostname.mockReturnValue(`  ${'x'.repeat(300)}  `);
    await runLogin({});
    expect(startLoginRequest).toHaveBeenLastCalledWith('https://api.novu.co', 'x'.repeat(64));

    hostname.mockReturnValue('');
    await runLogin({});
    expect(startLoginRequest).toHaveBeenLastCalledWith('https://api.novu.co', undefined);

    hostname.mockImplementation(() => {
      throw new Error('no hostname');
    });
    await runLogin({});
    expect(startLoginRequest).toHaveBeenLastCalledWith('https://api.novu.co', undefined);
  });

  it('stops without saving anything when the login is denied in the browser', async () => {
    checkLoginRequest
      .mockReset()
      .mockResolvedValueOnce({ status: 'pending', expiresIn: 1800, interval: 2 })
      .mockResolvedValue({ status: 'denied' });

    await expect(runLogin({})).rejects.toThrow(LOGIN_DENIED_MESSAGE);
    expect(checkLoginRequest).toHaveBeenCalledTimes(2);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('stops when the login request expires', async () => {
    checkLoginRequest.mockReset().mockResolvedValue({ status: 'expired' });

    await expect(runLogin({})).rejects.toThrow(/expired/);
    expect(saveConfig).not.toHaveBeenCalled();
  });
});

describe('introduceYourself', () => {
  const config: HumanCliConfig = {
    apiUrl: 'https://api.novu.co',
    auth: { mode: 'apiKey', secretKey: 'sk_account' },
    relayAgentIdentifier: 'human-relay',
  };
  const name = { firstName: 'Ada', lastName: 'Lovelace' };
  let stdout: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setupHumanRelay.mockResolvedValue({
      agentId: 'agent_1',
      agentIdentifier: 'human-relay',
      subscriberId: 'human_new',
    });
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it('asks who you are, makes you the contact of the account owner and saves it as who agents reach', async () => {
    const prompt = vi.fn().mockResolvedValue('  Grace   Hopper ');

    const result = await introduceYourself({ config, name }, { isTTY: true, prompt });

    // The name on the Human account is offered, so Enter is enough.
    expect(prompt).toHaveBeenCalledWith('Who are you? Your name, as agents will see it [Ada Lovelace]: ');
    expect(setupHumanRelay).toHaveBeenCalledWith(expect.anything(), {
      subscriberId: expect.stringMatching(/^human_[0-9a-f]{12}$/),
      operator: true,
      agentIdentifier: 'human-relay',
      firstName: 'Grace',
      lastName: 'Hopper',
    });
    // What the API answers is saved: an owner it already knew wins over the id suggested here.
    expect(saveConfig).toHaveBeenCalledWith({ ...config, subscriberId: 'human_new' });
    expect(result.subscriberId).toBe('human_new');
  });

  it('takes the name on the Human account when the answer is empty', async () => {
    await introduceYourself({ config, name }, { isTTY: true, prompt: vi.fn().mockResolvedValue('') });

    expect(setupHumanRelay.mock.calls[0][1]).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('does not ask without a terminal, and still saves who you are', async () => {
    const prompt = vi.fn();

    const result = await introduceYourself({ config, name }, { isTTY: false, prompt });

    expect(prompt).not.toHaveBeenCalled();
    expect(setupHumanRelay.mock.calls[0][1]).toMatchObject({ operator: true, firstName: 'Ada', lastName: 'Lovelace' });
    expect(result.subscriberId).toBe('human_new');
  });

  it('leaves the name out when nobody gave one', async () => {
    const prompt = vi.fn().mockResolvedValue(' ');

    await introduceYourself({ config }, { isTTY: true, prompt });

    expect(prompt).toHaveBeenCalledWith('Who are you? Your name, as agents will see it (optional): ');
    expect(setupHumanRelay.mock.calls[0][1]).not.toHaveProperty('firstName');
  });

  it('uses the id it suggested when an older API sends none back', async () => {
    setupHumanRelay.mockResolvedValue({ agentId: 'agent_1', agentIdentifier: 'human-relay', subscriberId: '' });

    const result = await introduceYourself({ config }, { isTTY: false, prompt: vi.fn() });

    expect(result.subscriberId).toBe(setupHumanRelay.mock.calls[0][1].subscriberId);
  });

  it('leaves the login as it is when the contact cannot be made', async () => {
    setupHumanRelay.mockRejectedValue(new Error('network down'));

    const result = await introduceYourself({ config, name }, { isTTY: false, prompt: vi.fn() });

    // Logged in either way; `human setup` makes the contact later.
    expect(result).toEqual(config);
    expect(saveConfig).not.toHaveBeenCalled();
    expect(stdout.mock.calls.map(([text]) => String(text)).join('')).toContain('network down');
  });
});

describe('describeNextStep', () => {
  const config: HumanCliConfig = {
    apiUrl: 'https://api.novu.co',
    auth: { mode: 'apiKey', secretKey: 'sk_account' },
    relayAgentIdentifier: 'human-relay',
  };

  it('says nothing changed for a setup that carried over', () => {
    expect(describeNextStep({ config: { ...config, subscriberId: 'human_abc' }, keptSetup: true })).toContain(
      'keep reaching you as before'
    );
  });

  it('says agents reach the account owner, and how to connect a channel if there is none', () => {
    const text = describeNextStep({ config: { ...config, subscriberId: 'human_owner' }, keptSetup: false });

    expect(text).toContain("now reach you on your account's channels");
    expect(text).toContain('human setup');
  });

  it('sends a computer that knows nobody to human setup', () => {
    expect(describeNextStep({ config, keptSetup: false })).toContain('Next, connect a channel');
  });
});

describe('withClaimToken', () => {
  it('adds the claim token next to the region the API put on the link', () => {
    expect(withClaimToken('https://gethuman.md/cli/login?region=eu', 'tok')).toBe(
      'https://gethuman.md/cli/login?region=eu&claim=tok'
    );
    expect(withClaimToken(LOGIN_URL, 'tok')).toBe(`${LOGIN_URL}&claim=tok`);
    expect(withClaimToken(LOGIN_URL, null)).toBe(LOGIN_URL);
  });
});
