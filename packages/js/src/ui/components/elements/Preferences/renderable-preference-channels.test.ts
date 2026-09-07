import { ChannelType } from '../../../../types';
import { isRenderablePreferenceChannel, RENDERABLE_PREFERENCE_CHANNELS } from './renderable-preference-channels';

describe('RENDERABLE_PREFERENCE_CHANNELS', () => {
  it('matches exactly the channels Preferences can label and icon', () => {
    expect([...RENDERABLE_PREFERENCE_CHANNELS].sort()).toEqual(
      [ChannelType.CHAT, ChannelType.EMAIL, ChannelType.IN_APP, ChannelType.PUSH, ChannelType.SMS].sort()
    );
  });
});

describe('isRenderablePreferenceChannel', () => {
  it('keeps renderable channels and drops tool and unknown keys', () => {
    const input = ['email', 'sms', 'tool', 'webhook', 'push', 'in_app', 'chat'];

    expect(input.filter(isRenderablePreferenceChannel)).toEqual(['email', 'sms', 'push', 'in_app', 'chat']);
  });

  it('returns false for tool and unknown keys', () => {
    expect(isRenderablePreferenceChannel(ChannelType.TOOL)).toBe(false);
    expect(isRenderablePreferenceChannel('unknown')).toBe(false);
  });
});
