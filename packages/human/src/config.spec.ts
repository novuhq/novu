import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type HumanCliConfig, loadConfig, resolveConfig, resolveVia, saveConfig } from './config';

const base: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_x' },
  relayAgentIdentifier: 'human-relay',
};

afterEach(() => {
  delete process.env.NOVU_HUMAN_CONFIG;
  delete process.env.NOVU_SECRET_KEY;
});

describe('config migration', () => {
  it('drops local channel lists and keeps default preference', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    writeFileSync(
      path,
      JSON.stringify({
        ...base,
        defaultHuman: { subscriberId: 'human_abc', integrationIdentifier: 'tg-1', platform: 'telegram' },
        channels: [{ platform: 'slack', integrationIdentifier: 'sl-1' }],
      })
    );

    const config = loadConfig();
    expect(config?.subscriberId).toBe('human_abc');
    expect(config?.defaultChannel).toBe('telegram');
    expect(config).not.toHaveProperty('channels');
  });

  it('persists without a channels array', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    saveConfig({
      ...base,
      subscriberId: 'human_abc',
      defaultChannel: 'telegram',
      channels: ['telegram'],
    } as HumanCliConfig & { channels: string[] });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      ...base,
      subscriberId: 'human_abc',
      defaultChannel: 'telegram',
    });
  });
});

describe('resolveVia', () => {
  const config: HumanCliConfig = {
    ...base,
    subscriberId: 'human_abc',
    defaultChannel: 'slack',
  };

  it('uses the default channel when no --via is passed', () => {
    expect(resolveVia(config)).toBe('slack');
  });

  it('honors --via overrides case-insensitively', () => {
    expect(resolveVia(config, 'Telegram')).toBe('telegram');
  });

  it('omits via when nothing is preferred so the API can pick', () => {
    expect(resolveVia({ ...base, subscriberId: 'human_abc' })).toBeUndefined();
  });
});

describe('resolveConfig', () => {
  it('uses NOVU_SECRET_KEY instead of keyless auth from the config file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    process.env.NOVU_SECRET_KEY = 'api_key_private';
    writeFileSync(
      path,
      JSON.stringify({
        ...base,
        subscriberId: 'human_abc',
        defaultChannel: 'telegram',
      })
    );

    expect(resolveConfig()).toEqual({
      ...base,
      auth: { mode: 'apiKey', secretKey: 'api_key_private' },
      subscriberId: 'human_abc',
      defaultChannel: 'telegram',
    });
  });
});
