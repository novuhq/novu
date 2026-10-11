import { describe, expect, it, vi } from 'vitest';

const { resolveOperatorName, reusableAuth } = await import('./setup');

describe('resolveOperatorName', () => {
  it('uses --name without prompting', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({ name: 'Dima Grossman' }, false, { isTTY: true, prompt })).resolves.toEqual({
      firstName: 'Dima',
      lastName: 'Grossman',
    });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('asks for first and last name on a first-run TTY', async () => {
    const prompt = vi.fn().mockResolvedValueOnce(' Alice ').mockResolvedValueOnce('Chen');

    await expect(resolveOperatorName({}, false, { isTTY: true, prompt })).resolves.toEqual({
      firstName: 'Alice',
      lastName: 'Chen',
    });
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(prompt.mock.calls[0][0]).toMatch(/first name/i);
    expect(prompt.mock.calls[1][0]).toMatch(/last name/i);
  });

  it('accepts a first name without a last name', async () => {
    const prompt = vi.fn().mockResolvedValueOnce('Alice').mockResolvedValueOnce('   ');

    await expect(resolveOperatorName({}, false, { isTTY: true, prompt })).resolves.toEqual({ firstName: 'Alice' });
  });

  it('skips the last-name question and leaves the name unset when first name is empty', async () => {
    const prompt = vi.fn().mockResolvedValue('   ');

    await expect(resolveOperatorName({}, false, { isTTY: true, prompt })).resolves.toBeUndefined();
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('never prompts when already set up or when stdin is not a TTY', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({}, true, { isTTY: true, prompt })).resolves.toBeUndefined();
    await expect(resolveOperatorName({}, false, { isTTY: false, prompt })).resolves.toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });
});

describe('reusableAuth', () => {
  const API_URL = 'https://api.novu.co';
  const login = {
    apiUrl: API_URL,
    auth: { mode: 'apiKey' as const, secretKey: 'sk_saved' },
    relayAgentIdentifier: 'human-relay',
  };
  const keyless = { ...login, auth: { mode: 'keyless' as const, keylessIdentifier: 'pk_keyless_1' } };

  it('prefers --secret-key or NOVU_SECRET_KEY', () => {
    expect(reusableAuth(login, API_URL, 'sk_flag')).toEqual({ mode: 'apiKey', secretKey: 'sk_flag' });
  });

  it('reuses the saved login or keyless setup for the same API', () => {
    expect(reusableAuth(login, API_URL, undefined)).toEqual(login.auth);
    expect(reusableAuth(keyless, API_URL, undefined)).toEqual(keyless.auth);
  });

  it('starts a new keyless setup without saved credentials for this API', () => {
    expect(reusableAuth(null, API_URL, undefined)).toBeNull();
    expect(reusableAuth(login, 'http://localhost:3000', undefined)).toBeNull();
    expect(reusableAuth({ ...login, auth: { mode: 'apiKey' } }, API_URL, undefined)).toBeNull();
  });
});
