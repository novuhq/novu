import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, CredentialsKeyEnum, SmsProviderIdEnum } from '../../../types';
import { birdSmsConfig } from '../credentials';
import { PROVIDER_ID_TO_CHANNEL_MAP, providers } from '../providers';
import { smsProviders } from './sms';

describe('bird SMS provider registry', () => {
  it('uses bird-sms as the provider id without colliding with legacy messagebird', () => {
    expect(SmsProviderIdEnum.Bird).toBe('bird-sms');
    expect(SmsProviderIdEnum.MessageBird).toBe('messagebird');
  });

  it('shapes birdSmsConfig with an API key and an optional From for built-in templates', () => {
    expect(birdSmsConfig.map((credential) => credential.key)).toEqual([
      CredentialsKeyEnum.ApiKey,
      CredentialsKeyEnum.From,
    ]);
    expect(birdSmsConfig.find((credential) => credential.key === CredentialsKeyEnum.From)?.required).toBe(false);
  });

  it('registers Bird in the Integration Store SMS list', () => {
    const entry = smsProviders.find((provider) => provider.id === SmsProviderIdEnum.Bird);

    expect(entry).toEqual(
      expect.objectContaining({
        displayName: 'Bird',
        channel: ChannelTypeEnum.SMS,
        logoFileName: { light: 'bird-sms.svg', dark: 'bird-sms.svg' },
      })
    );
    expect(entry?.docReference).toContain('/sms/bird');
    expect(providers.map((provider) => provider.id)).toContain(SmsProviderIdEnum.Bird);
    expect(PROVIDER_ID_TO_CHANNEL_MAP[SmsProviderIdEnum.Bird]).toBe(ChannelTypeEnum.SMS);
  });
});
