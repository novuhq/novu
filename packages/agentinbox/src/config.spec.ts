import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type CliConfig,
  configPath,
  loadConfig,
  resolveConfig,
  resolveTargetApiUrl,
  resolveVia,
  saveConfig,
} from './config';

const base: CliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_x' },
  relayAgentIdentifier: 'human-relay',
};

afterEach(() => {
  delete process.env.INBOX_CONFIG;
  delete process.env.INBOX_SECRET_KEY;
  delete process.env.INBOX_VIA;
  delete process.env.INBOX_API_URL;
});

describe('config file', () => {
  it('lives in ~/.agentinbox/config.json unless INBOX_CONFIG says otherwise', () => {
    expect(configPath()).toMatch(/\.agentinbox\/config\.json$/);
    process.env.INBOX_CONFIG = '/tmp/elsewhere.json';
    expect(configPath()).toBe('/tmp/elsewhere.json');
  });

  it('saves and loads the same config', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'inbox-config-')), 'config.json');
    process.env.INBOX_CONFIG = path;
    saveConfig({ ...base, subscriberId: 'ada', defaultChannel: 'telegram' });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      ...base,
      subscriberId: 'ada',
      defaultChannel: 'telegram',
    });
    expect(loadConfig()).toEqual({ ...base, subscriberId: 'ada', defaultChannel: 'telegram' });
  });

  it('fills in the API and relay agent a hand-written config leaves out', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'inbox-config-')), 'config.json');
    process.env.INBOX_CONFIG = path;
    writeFileSync(path, JSON.stringify({ auth: base.auth }));

    expect(loadConfig()).toEqual({ ...base, auth: base.auth });
  });
});

describe('resolveVia', () => {
  const config: CliConfig = {
    ...base,
    subscriberId: 'ada',
    defaultChannel: 'slack',
  };

  it('uses the default channel when no --via is passed', () => {
    expect(resolveVia(config)).toBe('slack');
  });

  it('honors --via overrides case-insensitively', () => {
    expect(resolveVia(config, 'Telegram')).toBe('telegram');
  });

  it('omits via when nothing is preferred so the API can pick', () => {
    expect(resolveVia({ ...base, subscriberId: 'ada' })).toBeUndefined();
  });

  it('falls back to INBOX_VIA over the config default, case-insensitively', () => {
    process.env.INBOX_VIA = 'Telegram';
    expect(resolveVia(config)).toBe('telegram');
  });

  it('lets a --via flag beat INBOX_VIA', () => {
    process.env.INBOX_VIA = 'telegram';
    expect(resolveVia(config, 'email')).toBe('email');
  });

  it('rejects an unsupported INBOX_VIA value', () => {
    process.env.INBOX_VIA = 'carrier-pigeon';
    expect(() => resolveVia(config)).toThrow(/Invalid INBOX_VIA/);
  });

  it('ignores an empty INBOX_VIA', () => {
    process.env.INBOX_VIA = '  ';
    expect(resolveVia(config)).toBe('slack');
  });

  it('skips INBOX_VIA and the saved default when neither applies to the recipients', () => {
    process.env.INBOX_VIA = 'telegram';
    expect(resolveVia(config, undefined, { useEnvVia: false, useSavedDefault: false })).toBeUndefined();
  });

  it('can use INBOX_VIA without falling back to the saved default', () => {
    process.env.INBOX_VIA = 'telegram';
    expect(resolveVia(config, undefined, { useEnvVia: true, useSavedDefault: false })).toBe('telegram');

    delete process.env.INBOX_VIA;
    expect(resolveVia(config, undefined, { useEnvVia: true, useSavedDefault: false })).toBeUndefined();
  });

  it('still honors an explicit --via when no default applies', () => {
    expect(resolveVia(config, 'Email', { useEnvVia: false, useSavedDefault: false })).toBe('email');
  });
});

describe('resolveConfig', () => {
  it('uses INBOX_SECRET_KEY instead of keyless auth from the config file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'inbox-config-')), 'config.json');
    process.env.INBOX_CONFIG = path;
    process.env.INBOX_SECRET_KEY = 'api_key_private';
    writeFileSync(
      path,
      JSON.stringify({
        ...base,
        subscriberId: 'ada',
        defaultChannel: 'telegram',
      })
    );

    expect(resolveConfig()).toEqual({
      ...base,
      auth: { mode: 'apiKey', secretKey: 'api_key_private' },
      subscriberId: 'ada',
      defaultChannel: 'telegram',
    });
  });

  it('works with no config file at all when INBOX_SECRET_KEY is set', () => {
    process.env.INBOX_CONFIG = join(mkdtempSync(join(tmpdir(), 'inbox-config-')), 'missing.json');
    process.env.INBOX_SECRET_KEY = 'api_key_private';

    expect(resolveConfig()).toEqual({
      apiUrl: 'https://api.novu.co',
      relayAgentIdentifier: 'human-relay',
      auth: { mode: 'apiKey', secretKey: 'api_key_private' },
    });
  });
});

describe('resolveTargetApiUrl', () => {
  it('prefers --api-url, then INBOX_API_URL, then the API the config belongs to', () => {
    const eu = { ...base, apiUrl: 'https://eu.api.novu.co' };

    expect(resolveTargetApiUrl('http://localhost:3000/', eu)).toBe('http://localhost:3000');
    process.env.INBOX_API_URL = 'http://127.0.0.1:3000';
    expect(resolveTargetApiUrl(undefined, eu)).toBe('http://127.0.0.1:3000');
    delete process.env.INBOX_API_URL;
    expect(resolveTargetApiUrl(undefined, eu)).toBe('https://eu.api.novu.co');
    expect(resolveTargetApiUrl(undefined, null)).toBe('https://api.novu.co');
  });

  it('ignores an empty INBOX_API_URL', () => {
    process.env.INBOX_API_URL = ' ';

    expect(resolveTargetApiUrl(undefined, base)).toBe('https://api.novu.co');
  });
});
