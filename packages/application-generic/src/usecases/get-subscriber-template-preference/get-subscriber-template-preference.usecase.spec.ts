import {
  overridePreferences,
  filteredPreference,
} from './get-subscriber-template-preference.usecase';
import { ChannelTypeEnum } from '@novu/shared';

describe('overridePreferences', function () {
  beforeEach(function () {});

  it('should be overridden by the subscribers preference', async function () {
    const templateChannelPreference = {
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };
    const subscriberChannelPreference = {
      email: true,
      sms: true,
      push: false,
    };

    const { channels, overrides } = overridePreferences(
      {
        template: templateChannelPreference,
        subscriber: subscriberChannelPreference,
      },
      {
        email: true,
        sms: true,
        in_app: true,
        chat: true,
        push: true,
      }
    );

    const expectedPreferenceResult = {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: false,
    };

    expect(channels).toEqual(expectedPreferenceResult);
    expect(
      overrides.find((override) => override.channel === 'email').source
    ).toEqual('subscriber');
    expect(
      overrides.find((override) => override.channel === 'sms').source
    ).toEqual('subscriber');
    expect(
      overrides.find((override) => override.channel === 'in_app').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'chat').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'push').source
    ).toEqual('subscriber');
  });

  it('should get preference from template when subscriber preference are empty', async function () {
    const templateChannelPreference = {
      email: false,
      sms: true,
      in_app: false,
      chat: true,
      push: true,
    };
    const subscriberChannelPreference = {};

    const { channels, overrides } = overridePreferences(
      {
        template: templateChannelPreference,
        subscriber: subscriberChannelPreference,
      },
      {
        email: true,
        sms: true,
        in_app: true,
        chat: true,
        push: true,
      }
    );

    const expectedPreferenceResult = {
      email: false,
      sms: true,
      in_app: false,
      chat: true,
      push: true,
    };

    expect(channels).toEqual(expectedPreferenceResult);
    expect(
      overrides.find((override) => override.channel === 'email').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'sms').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'in_app').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'chat').source
    ).toEqual('template');
    expect(
      overrides.find((override) => override.channel === 'push').source
    ).toEqual('template');
  });
});

describe('filteredPreference', function () {
  it('should filter active channels in the preference ', async function () {
    const preferences = {
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };
    const activeChannels = [ChannelTypeEnum.IN_APP, ChannelTypeEnum.PUSH];

    const channelPreferences = filteredPreference(preferences, activeChannels);
    const expectedPreferenceResult = {
      in_app: true,
      push: true,
    };

    expect(Object.keys(channelPreferences).length).toEqual(2);
    expect(channelPreferences).toEqual(expectedPreferenceResult);
  });

  it('should filter all if no active channels ', async function () {
    const preferences = {
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };
    const activeChannels = [];

    const channelPreferences = filteredPreference(preferences, activeChannels);

    expect(Object.keys(channelPreferences).length).toEqual(0);
  });

  it('should not filter preference if all the channels are active', async function () {
    const preferences = {
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };
    const activeChannels = [
      ChannelTypeEnum.IN_APP,
      ChannelTypeEnum.PUSH,
      ChannelTypeEnum.SMS,
      ChannelTypeEnum.EMAIL,
      ChannelTypeEnum.CHAT,
    ];

    const channelPreferences = filteredPreference(preferences, activeChannels);

    const expectedPreferenceResult = {
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };

    expect(Object.keys(channelPreferences).length).toEqual(5);
    expect(channelPreferences).toEqual(expectedPreferenceResult);
  });
});
