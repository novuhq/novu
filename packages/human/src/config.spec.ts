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
  it('folds the legacy defaultHuman shape into subscriberId + channels', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    writeFileSync(
      path,
      JSON.stringify({
        ...base,
        defaultHuman: { subscriberId: 'human_abc', integrationIdentifier: 'tg-1', platform: 'telegram' },
      })
    );

    const config = loadConfig();
    expect(config?.subscriberId).toBe('human_abc');
    expect(config?.channels).toEqual([{ platform: 'telegram', integrationIdentifier: 'tg-1' }]);
    expect(config?.defaultChannel).toBe('telegram');
  });

  it('drops the legacy shape on save', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-config-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;
    saveConfig({
      ...base,
      subscriberId: 'human_abc',
      channels: [{ platform: 'telegram', integrationIdentifier: 'tg-1' }],
      defaultChannel: 'telegram',
      defaultHuman: { subscriberId: 'human_abc', integrationIdentifier: 'tg-1', platform: 'telegram' },
    });

    expect(JSON.parse(readFileSync(path, 'utf8'))).to.not.have.property('defaultHuman');
  });
});

describe('resolveChannel', () => {
  const config: HumanCliConfig = {
    ...base,
    subscriberId: 'human_abc',
    channels: [
      { platform: 'telegram', integrationIdentifier: 'tg-1' },
      { platform: 'slack', integrationIdentifier: 'sl-1' },
    ],
    defaultChannel: 'slack',
  };

  it('uses the default channel when no --via is passed', () => {
    expect(resolveChannel(config).integrationIdentifier).toBe('sl-1');
  });

  it('honors --via overrides case-insensitively', () => {
    expect(resolveChannel(config, 'Telegram').integrationIdentifier).toBe('tg-1');
  });

  it('falls back to the first channel when the default is dangling', () => {
    expect(resolveChannel({ ...config, defaultChannel: 'whatsapp' }).integrationIdentifier).toBe('tg-1');
  });

  it('names the linked channels when --via misses', () => {
    expect(() => resolveChannel(config, 'whatsapp')).toThrow(/human setup whatsapp/);
  });

  it('sends humans to setup when nothing is linked', () => {
    expect(() => resolveChannel({ ...base })).toThrow(/npx @novu\/human setup/);
  });
});
