import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectNovuCredentials, resolveNovuCredentials } from './credentials.js';

const ENV_KEYS = ['NOVU_SECRET_KEY', 'NOVU_AGENT_IDENTIFIER', 'NOVU_API_BASE_URL'] as const;

describe('resolveNovuCredentials', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('resolves from env, defaulting the api base url', async () => {
    process.env.NOVU_SECRET_KEY = 'sk_env';
    process.env.NOVU_AGENT_IDENTIFIER = 'bot_env';
    await expect(resolveNovuCredentials()).resolves.toEqual({
      secretKey: 'sk_env',
      agentIdentifier: 'bot_env',
      apiBaseUrl: 'https://api.novu.co',
    });
  });

  it('lets explicit input win over env', async () => {
    process.env.NOVU_SECRET_KEY = 'sk_env';
    process.env.NOVU_AGENT_IDENTIFIER = 'bot_env';
    await expect(
      resolveNovuCredentials({ secretKey: 'sk_explicit', apiBaseUrl: 'https://eu.api.novu.co' }),
    ).resolves.toEqual({
      secretKey: 'sk_explicit',
      agentIdentifier: 'bot_env',
      apiBaseUrl: 'https://eu.api.novu.co',
    });
  });

  it('accepts a (possibly async) resolver function', async () => {
    const creds = await resolveNovuCredentials(async () => ({ secretKey: 'sk_fn', agentIdentifier: 'bot_fn' }));
    expect(creds).toEqual({ secretKey: 'sk_fn', agentIdentifier: 'bot_fn', apiBaseUrl: 'https://api.novu.co' });
  });

  it('throws a helpful error when the secret key is missing', async () => {
    process.env.NOVU_AGENT_IDENTIFIER = 'bot_env';
    await expect(resolveNovuCredentials()).rejects.toThrow(/NOVU_SECRET_KEY/);
  });

  it('throws a helpful error when the agent identifier is missing', async () => {
    process.env.NOVU_SECRET_KEY = 'sk_env';
    await expect(resolveNovuCredentials()).rejects.toThrow(/NOVU_AGENT_IDENTIFIER/);
  });
});

describe('connectNovuCredentials', () => {
  it('returns a lazy resolver that falls back to env', async () => {
    process.env.NOVU_SECRET_KEY = 'sk_env';
    process.env.NOVU_AGENT_IDENTIFIER = 'bot_env';
    const resolver = connectNovuCredentials('novu/my-agent', { agentIdentifier: 'bot_override' });
    await expect(resolveNovuCredentials(resolver)).resolves.toMatchObject({
      secretKey: 'sk_env',
      agentIdentifier: 'bot_override',
    });
    delete process.env.NOVU_SECRET_KEY;
    delete process.env.NOVU_AGENT_IDENTIFIER;
  });
});
