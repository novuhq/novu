import { ChannelType } from '../../../../types';
import { filterRenderablePreferenceChannels, RENDERABLE_PREFERENCE_CHANNELS } from './renderable-preference-channels';

describe('RENDERABLE_PREFERENCE_CHANNELS', () => {
  it('includes channels the Preferences UI can label and icon', () => {
    expect([...RENDERABLE_PREFERENCE_CHANNELS]).toEqual(
      expect.arrayContaining([
        ChannelType.IN_APP,
        ChannelType.EMAIL,
        ChannelType.SMS,
        ChannelType.CHAT,
        ChannelType.PUSH,
      ])
    );
    expect(RENDERABLE_PREFERENCE_CHANNELS.size).toBe(5);
  });

  it('does not include tool', () => {
    expect(RENDERABLE_PREFERENCE_CHANNELS.has(ChannelType.TOOL)).toBe(false);
  });
});

describe('filterRenderablePreferenceChannels', () => {
  it('keeps renderable channels and drops tool and unknown keys', () => {
    const input = ['email', 'sms', 'tool', 'webhook', 'push', 'in_app', 'chat'] as const;

    expect(filterRenderablePreferenceChannels(input)).toEqual(['email', 'sms', 'push', 'in_app', 'chat']);
  });

  it('returns an empty array when every channel is non-renderable', () => {
    expect(filterRenderablePreferenceChannels(['tool', 'unknown'])).toEqual([]);
  });
});
