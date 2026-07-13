import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, SignalsProviderIdEnum } from '../../../types';
import { PROVIDER_ID_TO_CHANNEL_MAP, providers } from '../providers';
import { signalsProviders } from './signals';

describe('signalsProviders', () => {
  it('includes GitHub and Custom Webhook providers on the signals channel', () => {
    expect(signalsProviders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: SignalsProviderIdEnum.GitHub,
          channel: ChannelTypeEnum.SIGNALS,
        }),
        expect.objectContaining({
          id: SignalsProviderIdEnum.Webhook,
          channel: ChannelTypeEnum.SIGNALS,
        }),
      ])
    );
    expect(SignalsProviderIdEnum.GitHub).toBe('github');
    expect(SignalsProviderIdEnum.Webhook).toBe('signals-webhook');
  });

  it('is included in the shared providers array', () => {
    const signalsFromProviders = providers.filter((provider) => provider.channel === ChannelTypeEnum.SIGNALS);

    expect(signalsFromProviders).toHaveLength(2);
    expect(signalsFromProviders.map((provider) => provider.id).sort()).toEqual(['github', 'signals-webhook']);
  });

  it('maps github and signals-webhook provider ids to ChannelTypeEnum.SIGNALS', () => {
    expect(PROVIDER_ID_TO_CHANNEL_MAP['github']).toBe(ChannelTypeEnum.SIGNALS);
    expect(PROVIDER_ID_TO_CHANNEL_MAP['signals-webhook']).toBe(ChannelTypeEnum.SIGNALS);
  });
});
