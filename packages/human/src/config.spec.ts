import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, resolveChannel, saveConfig, type HumanCliConfig } from './config';

const base: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_x' },
  relayAgentIdentifier: 'human-relay',
};

afterEach(() => {
  delete process.env.NOVU_HUMAN_CONFIG;
});

describe('config migration', () => {
  it('folds legacy channel objects and defaultHuman into platform strings', () => {
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
    expect(config?.channels).toEqual(['slack', 'telegram']);
    expect(config?.defaultChannel).toBe('telegram');
  });

  it('persists platforms only', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    saveConfig({
      ...base,
      subscriberId: 'human_abc',
      channels: ['telegram'],
      defaultChannel: 'telegram',
    });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      ...base,
      subscriberId: 'human_abc',
      channels: ['telegram'],
      defaultChannel: 'telegram',
    });
  });
});

describe('resolveChannel', () => {
  const config: HumanCliConfig = {
    ...base,
    subscriberId: 'human_abc',
    channels: ['telegram', 'slack'],
    defaultChannel: 'slack',
  };

  it('uses the default channel when no --via is passed', () => {
    expect(resolveChannel(config)).toBe('slack');
  });

  it('honors --via overrides case-insensitively', () => {
    expect(resolveChannel(config, 'Telegram')).toBe('telegram');
  });

  it('falls back to the first channel when the default is dangling', () => {
    expect(resolveChannel({ ...config, defaultChannel: 'whatsapp' })).toBe('telegram');
  });

  it('names the linked channels when --via misses', () => {
    expect(() => resolveChannel(config, 'whatsapp')).toThrow(/human setup whatsapp/);
  });

  it('sends humans to setup when nothing is linked', () => {
    expect(() => resolveChannel({ ...base })).toThrow(/npx @novu\/human setup/);
  });
});
