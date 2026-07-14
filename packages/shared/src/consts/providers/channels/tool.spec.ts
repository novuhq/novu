import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, ToolProviderIdEnum } from '../../../types';
import { PROVIDER_ID_TO_CHANNEL_MAP, providers } from '../providers';
import { toolProviders } from './tool';

describe('toolProviders', () => {
  it('includes GitHub and Custom Webhook providers on the tool channel', () => {
    expect(toolProviders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ToolProviderIdEnum.GitHub,
          channel: ChannelTypeEnum.TOOL,
        }),
        expect.objectContaining({
          id: ToolProviderIdEnum.Webhook,
          channel: ChannelTypeEnum.TOOL,
        }),
      ])
    );
    expect(ToolProviderIdEnum.GitHub).toBe('github');
    expect(ToolProviderIdEnum.Webhook).toBe('tool-webhook');
  });

  it('is included in the shared providers array', () => {
    const toolFromProviders = providers.filter((provider) => provider.channel === ChannelTypeEnum.TOOL);

    expect(toolFromProviders).toHaveLength(2);
    expect(toolFromProviders.map((provider) => provider.id).sort()).toEqual(['github', 'tool-webhook']);
  });

  it('maps github and tool-webhook provider ids to ChannelTypeEnum.TOOL', () => {
    expect(PROVIDER_ID_TO_CHANNEL_MAP['github']).toBe(ChannelTypeEnum.TOOL);
    expect(PROVIDER_ID_TO_CHANNEL_MAP['tool-webhook']).toBe(ChannelTypeEnum.TOOL);
  });
});
