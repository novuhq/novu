import { chmodSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lookToKeep, rememberLook, savedLook } from './agent-look';
import { type CliConfig, configPath, DEFAULT_API_URL, loadConfig, saveConfig } from './config';

const account: CliConfig = {
  apiUrl: DEFAULT_API_URL,
  auth: { mode: 'apiKey', secretKey: 'sk_account' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'ada',
};

const DROP = { shape: 'drop', color: 'coral' } as const;
const BEAN = { shape: 'bean', color: 'bone' } as const;

beforeEach(() => {
  process.env.INBOX_CONFIG = join(mkdtempSync(join(tmpdir(), 'inbox-look-')), 'config.json');
  delete process.env.INBOX_SECRET_KEY;
  delete process.env.INBOX_API_URL;
});

afterEach(() => {
  delete process.env.INBOX_CONFIG;
  delete process.env.INBOX_SECRET_KEY;
  delete process.env.INBOX_API_URL;
});

describe('savedLook', () => {
  it('is the look saved with the agent this computer acts as', () => {
    expect(savedLook()).toBeUndefined();

    saveConfig({ ...account, look: DROP });

    expect(savedLook()).toEqual(DROP);
  });

  it('is none for a command headed for another API or another account, whose agent isn’t known yet', () => {
    saveConfig({ ...account, look: DROP });

    expect(savedLook({ apiUrl: 'http://localhost:4300/api' })).toBeUndefined();
    expect(savedLook({ secretKey: 'sk_other_account' })).toBeUndefined();
    expect(savedLook({ secretKey: 'sk_account' })).toEqual(DROP);

    process.env.INBOX_SECRET_KEY = 'sk_other_account';
    expect(savedLook()).toBeUndefined();
    delete process.env.INBOX_SECRET_KEY;

    process.env.INBOX_API_URL = 'http://localhost:4300/api';
    expect(savedLook()).toBeUndefined();
  });

  it('is none for a command about another agent than the saved one, whose look isn’t known yet', () => {
    saveConfig({ ...account, look: DROP });

    expect(savedLook({ agentIdentifier: 'second-agent' })).toBeUndefined();
    expect(savedLook({ agentIdentifier: account.relayAgentIdentifier })).toEqual(DROP);
  });

  it('is none for a look kept by a newer CLI that this one can’t draw', () => {
    saveConfig({ ...account, look: { shape: 'cube', color: 'coral' } as never });

    expect(savedLook()).toBeUndefined();
  });
});

describe('lookToKeep', () => {
  const next = { apiUrl: account.apiUrl, auth: account.auth, relayAgentIdentifier: account.relayAgentIdentifier };

  it('takes the look the API answered, without the card’s art', () => {
    expect(lookToKeep(next, null, { ...DROP, art: { kind: 'waves', seed: 7 } })).toEqual({ look: DROP });
    expect(lookToKeep(next, { ...account, look: BEAN }, DROP)).toEqual({ look: DROP });
  });

  it('keeps the saved look for the same agent when an API from before looks says nothing', () => {
    expect(lookToKeep(next, { ...account, look: BEAN }, undefined)).toEqual({ look: BEAN });
    // A trailing slash is still the same API.
    expect(lookToKeep({ ...next, apiUrl: `${account.apiUrl}/` }, { ...account, look: BEAN }, undefined)).toEqual({
      look: BEAN,
    });
  });

  it('keeps none for another agent, another account or another API: a look belongs to one agent', () => {
    const saved = { ...account, look: BEAN };

    expect(lookToKeep({ ...next, relayAgentIdentifier: 'second-agent' }, saved, undefined)).toEqual({});
    expect(lookToKeep({ ...next, auth: { mode: 'apiKey', secretKey: 'sk_other' } }, saved, undefined)).toEqual({});
    expect(lookToKeep({ ...next, apiUrl: 'http://localhost:4300/api' }, saved, undefined)).toEqual({});
    // A setup without an account that moved into one: its agent only ever had the original look.
    expect(
      lookToKeep(next, { ...saved, auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_1' } }, undefined)
    ).toEqual({});
    expect(lookToKeep(next, null, undefined)).toEqual({});
  });

  it('adds nothing to the config for a look this CLI doesn’t know', () => {
    expect(lookToKeep(next, null, { shape: 'cube', color: 'coral' })).toEqual({});
  });
});

describe('rememberLook', () => {
  it('saves the look an answer carries next to what is saved already, and gives it back', () => {
    saveConfig({ ...account, defaultChannel: 'telegram', computerId: 'cmp_this_computer_0001' });

    expect(rememberLook(account, { ...DROP, art: { kind: 'rays', seed: 0 } })).toEqual(DROP);

    expect(loadConfig()).toEqual({
      ...account,
      defaultChannel: 'telegram',
      computerId: 'cmp_this_computer_0001',
      look: DROP,
    });
  });

  it('changes nothing for an answer without a look, or with one this CLI can’t draw', () => {
    saveConfig({ ...account, look: BEAN });

    expect(rememberLook(account, undefined)).toBeUndefined();
    expect(rememberLook(account, { shape: 'cube', color: 'coral' })).toBeUndefined();

    expect(loadConfig()?.look).toEqual(BEAN);
  });

  it('gives back, but doesn’t save, the look of an agent reached with a key from the shell', () => {
    saveConfig({ ...account, look: BEAN });

    // INBOX_SECRET_KEY names another account, so the answer is about another agent than the saved one.
    const fromShell: CliConfig = { ...account, auth: { mode: 'apiKey', secretKey: 'sk_from_the_shell' } };
    expect(rememberLook(fromShell, DROP)).toEqual(DROP);

    expect(loadConfig()?.look).toEqual(BEAN);
  });

  it('writes no config where none is saved', () => {
    expect(rememberLook(account, DROP)).toEqual(DROP);

    expect(loadConfig()).toBeNull();
  });

  it('still gives the look back when the config can’t be written, so the command that asked goes on', () => {
    saveConfig({ ...account, look: BEAN });
    chmodSync(configPath(), 0o444);

    try {
      expect(rememberLook(account, DROP)).toEqual(DROP);
      expect(loadConfig()?.look).toEqual(BEAN);
    } finally {
      chmodSync(configPath(), 0o600);
    }
  });
});
