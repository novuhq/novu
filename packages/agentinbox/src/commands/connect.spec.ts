import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_INBOX_HOST_HEADER,
  AGENT_INBOX_VIA_HEADER,
  ANALYTICS_SOURCE_HEADER,
  ApiError,
  createApiClient,
  createPublicApiClient,
} from '../api/client';
import type { CliConfig } from '../config';
import { HOST_MARKER_VARIABLES } from '../host';

/** As in a shell no host started: whatever ran these tests, no host's variables are set. */
function clearHostMarkers() {
  for (const name of HOST_MARKER_VARIABLES) {
    vi.stubEnv(name, '');
  }
}

const connectWithCode = vi.fn();
const findOperator = vi.fn();
const loadConfig = vi.fn();
const saveConfig = vi.fn();

vi.mock('../api/connect', () => ({
  connectWithCode: (...args: unknown[]) => connectWithCode(...args),
}));

vi.mock('../api/login', () => ({
  findOperator: (...args: unknown[]) => findOperator(...args),
}));

vi.mock('../config', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config')>();

  return {
    ...original,
    loadConfig: () => loadConfig(),
    saveConfig: (...args: unknown[]) => saveConfig(...args),
  };
});

const { CONNECT_CANCELED_MESSAGE, CONNECT_UNAVAILABLE_MESSAGE, readAgent, readCode, runConnect } = await import(
  './connect'
);

const CONNECTED = {
  apiKey: 'sk_account',
  environmentId: 'env_1',
  agent: { identifier: 'human-relay', name: 'Atlas', handle: 'atlas' },
};

const keylessConfig: CliConfig = {
  apiUrl: 'https://www.agentinbox.md/api',
  auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_1' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'ada',
  defaultChannel: 'telegram',
};

const loggedInConfig: CliConfig = {
  apiUrl: 'https://www.agentinbox.md/api',
  auth: { mode: 'apiKey', secretKey: 'sk_account' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'ada',
  defaultChannel: 'slack',
};

/** A terminal that answers every question with `answer`, or no terminal at all. */
function ioAnswering(answer: string | null) {
  const prompt = vi.fn().mockResolvedValue(answer ?? '');

  return { io: { isTTY: answer !== null, prompt }, prompt };
}

describe('readAgent', () => {
  it('takes the agent as its address starts', () => {
    expect(readAgent('atlas')).toBe('atlas');
    expect(readAgent(' Atlas-Prime ')).toBe('atlas-prime');
    expect(readAgent('atlas@agentinbox.md')).toBe('atlas');
  });

  it('refuses what is not an address', () => {
    expect(() => readAgent('Atlas Prime')).toThrow('connect atlas --code');
    expect(() => readAgent('')).toThrow();
    expect(() => readAgent('a'.repeat(33))).toThrow();
  });
});

describe('readCode', () => {
  it('takes the code in any case, with or without the dash', () => {
    expect(readCode('BCDF-GHJK')).toBe('BCDF-GHJK');
    expect(readCode('bcdfghjk')).toBe('BCDF-GHJK');
    expect(readCode(' bcdf ghjk ')).toBe('BCDF-GHJK');
  });

  it('refuses a missing or malformed code before asking the API', () => {
    expect(() => readCode(undefined)).toThrow('--code BCDF-GHJK');
    expect(() => readCode('1234-5678')).toThrow();
    expect(() => readCode('BCDF-GHJ')).toThrow();
  });
});

describe('runConnect', () => {
  const originalApiUrl = process.env.INBOX_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INBOX_API_URL;
    loadConfig.mockReturnValue(null);
    connectWithCode.mockResolvedValue(CONNECTED);
    findOperator.mockResolvedValue('ada');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalApiUrl === undefined) {
      delete process.env.INBOX_API_URL;
    } else {
      process.env.INBOX_API_URL = originalApiUrl;
    }
  });

  it('trades the code for the account key and acts as the agent from then on', async () => {
    const { io, prompt } = ioAnswering(null);

    const result = await runConnect('Atlas', { code: 'bcdf ghjk' }, io);

    expect(connectWithCode).toHaveBeenCalledWith('https://www.agentinbox.md/api', {
      agent: 'atlas',
      code: 'BCDF-GHJK',
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: 'https://www.agentinbox.md/api',
      auth: { mode: 'apiKey', secretKey: 'sk_account' },
      relayAgentIdentifier: 'human-relay',
      subscriberId: 'ada',
    });
    expect(result).toMatchObject({ agent: CONNECTED.agent, keptSetup: false });
  });

  it('connects to the API that --api-url or INBOX_API_URL names', async () => {
    process.env.INBOX_API_URL = 'http://localhost:1356/';

    await runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io);
    expect(connectWithCode).toHaveBeenLastCalledWith('http://localhost:1356', expect.anything());

    await runConnect('atlas', { code: 'BCDF-GHJK', apiUrl: 'http://127.0.0.1:4000' }, ioAnswering(null).io);
    expect(connectWithCode).toHaveBeenLastCalledWith('http://127.0.0.1:4000', expect.anything());
  });

  it('without a terminal, leaves a setup already here alone unless --yes says otherwise, and keeps the code unused', async () => {
    loadConfig.mockReturnValue(keylessConfig);

    await expect(runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io)).rejects.toThrow('--yes');
    expect(connectWithCode).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();

    await runConnect('atlas', { code: 'BCDF-GHJK', yes: true }, ioAnswering(null).io);
    expect(connectWithCode).toHaveBeenCalledTimes(1);
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { mode: 'apiKey', secretKey: 'sk_account' } })
    );
  });

  it('on a terminal, asks before it replaces a setup, and a no changes nothing', async () => {
    loadConfig.mockReturnValue(keylessConfig);
    const declined = ioAnswering('n');

    await expect(runConnect('atlas', { code: 'BCDF-GHJK' }, declined.io)).rejects.toThrow(CONNECT_CANCELED_MESSAGE);
    expect(declined.prompt).toHaveBeenCalledWith(expect.stringContaining('login'));
    expect(connectWithCode).not.toHaveBeenCalled();

    const accepted = ioAnswering('y');
    await runConnect('atlas', { code: 'BCDF-GHJK' }, accepted.io);
    expect(connectWithCode).toHaveBeenCalledTimes(1);
  });

  it('keeps who agents reach and their channel when the code is for the account this computer has', async () => {
    loadConfig.mockReturnValue(loggedInConfig);

    const result = await runConnect('atlas', { code: 'BCDF-GHJK', yes: true }, ioAnswering(null).io);

    expect(result.keptSetup).toBe(true);
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ subscriberId: 'ada', defaultChannel: 'slack', relayAgentIdentifier: 'human-relay' })
    );
  });

  it('takes the account’s contact for its owner when the code is for another account', async () => {
    loadConfig.mockReturnValue({ ...loggedInConfig, auth: { mode: 'apiKey', secretKey: 'sk_other' } });
    findOperator.mockResolvedValue('operator_1');

    const result = await runConnect('atlas', { code: 'BCDF-GHJK', yes: true }, ioAnswering(null).io);

    expect(result.keptSetup).toBe(false);
    const saved = saveConfig.mock.calls[0][0] as CliConfig;
    expect(saved.subscriberId).toBe('operator_1');
    expect(saved.defaultChannel).toBeUndefined();
  });

  it('remembers the host the code was made for, when the shell doesn’t say which host runs the CLI', async () => {
    clearHostMarkers();
    connectWithCode.mockResolvedValue({ ...CONNECTED, host: 'hermes' });

    await runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io);

    expect((saveConfig.mock.calls[0][0] as CliConfig).host).toBe('hermes');
  });

  it('remembers no host when the shell says which one runs the CLI, or when it would be General', async () => {
    clearHostMarkers();
    vi.stubEnv('AI_AGENT', 'claude-code_2-1-309_agent');
    connectWithCode.mockResolvedValue({ ...CONNECTED, host: 'claude-code' });
    await runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io);

    clearHostMarkers();
    connectWithCode.mockResolvedValue({ ...CONNECTED, host: 'general' });
    await runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io);

    expect(saveConfig.mock.calls[0][0]).not.toHaveProperty('host');
    expect(saveConfig.mock.calls[1][0]).not.toHaveProperty('host');
  });

  it('still saves the key when the owner can’t be looked up: the code is used up by then', async () => {
    findOperator.mockRejectedValue(new Error('network down'));

    const result = await runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io);

    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(result.config.subscriberId).toBeUndefined();
  });

  it('passes the API’s words on for a used, expired or wrong code, and saves nothing', async () => {
    connectWithCode.mockRejectedValue(
      new ApiError('This code was used already.', 409, 'POST /v1/connect', { code: 'connect_code_used' })
    );

    await expect(runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io)).rejects.toThrow(
      'This code was used already.'
    );
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('tells an API without one-time codes apart from a wrong code', async () => {
    connectWithCode.mockRejectedValue(
      new ApiError('Cannot POST /v1/connect', 404, 'POST /v1/connect', { statusCode: 404 })
    );

    await expect(runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io)).rejects.toThrow(
      CONNECT_UNAVAILABLE_MESSAGE
    );

    connectWithCode.mockRejectedValue(
      new ApiError('No agent has this code.', 404, 'POST /v1/connect', { code: 'connect_code_invalid' })
    );

    await expect(runConnect('atlas', { code: 'BCDF-GHJK' }, ioAnswering(null).io)).rejects.toThrow(
      'No agent has this code.'
    );
  });
});

describe('API requests', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('say which host runs the CLI, from the shell it runs in, over the host this computer was connected for', () => {
    clearHostMarkers();
    vi.stubEnv('AI_AGENT', 'claude-code_2-1-309_agent');

    const authed = createApiClient({
      apiUrl: 'https://www.agentinbox.md/api',
      secretKey: 'sk_account',
      host: 'hermes',
    });
    const anonymous = createPublicApiClient('https://www.agentinbox.md/api');

    expect(authed.axios.defaults.headers[AGENT_INBOX_HOST_HEADER]).toBe('claude-code');
    expect(anonymous.defaults.headers[AGENT_INBOX_HOST_HEADER]).toBe('claude-code');
  });

  it('name the host this computer was connected for when the shell does not say, and no host otherwise', () => {
    clearHostMarkers();

    const connected = createApiClient({ apiUrl: 'https://www.agentinbox.md/api', secretKey: 'sk', host: 'hermes' });
    const unnamed = createApiClient({ apiUrl: 'https://www.agentinbox.md/api', secretKey: 'sk' });

    expect(connected.axios.defaults.headers[AGENT_INBOX_HOST_HEADER]).toBe('hermes');
    expect(unnamed.axios.defaults.headers).not.toHaveProperty(AGENT_INBOX_HOST_HEADER);
    expect(createPublicApiClient('https://www.agentinbox.md/api').defaults.headers).not.toHaveProperty(
      AGENT_INBOX_HOST_HEADER
    );
  });

  it('say they come from the CLI, so reading the inbox counts as this host checking it', () => {
    const authed = createApiClient({ apiUrl: 'https://www.agentinbox.md/api', secretKey: 'sk_account' });
    const anonymous = createPublicApiClient('https://www.agentinbox.md/api');

    expect(authed.axios.defaults.headers[AGENT_INBOX_VIA_HEADER]).toBe('cli');
    expect(anonymous.defaults.headers[AGENT_INBOX_VIA_HEADER]).toBe('cli');
  });

  it("say they come from the CLI for Novu's analytics", () => {
    const authed = createApiClient({ apiUrl: 'https://api.novu.co', secretKey: 'sk_account' });
    const anonymous = createPublicApiClient('https://api.novu.co');

    expect(authed.axios.defaults.headers[ANALYTICS_SOURCE_HEADER]).toBe('cli');
    expect(anonymous.defaults.headers[ANALYTICS_SOURCE_HEADER]).toBe('cli');
  });
});
