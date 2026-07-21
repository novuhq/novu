import { ChannelTypeEnum } from '@novu/shared';
import { overridePreferences } from './get-subscriber-template-preference.usecase';
import {
  buildDefaultPreferenceChannels,
  filteredPreference,
  filterPreferenceChannelsByFeatureFlags,
  filterWorkflowPreferencesByFeatureFlags,
} from './preference-channels.utils';

describe('overridePreferences', () => {
  beforeEach(() => {});

  it('should be overridden by the subscribers preference', async () => {
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
    expect(overrides.find((override) => override.channel === 'email').source).toEqual('subscriber');
    expect(overrides.find((override) => override.channel === 'sms').source).toEqual('subscriber');
    expect(overrides.find((override) => override.channel === 'in_app').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'chat').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'push').source).toEqual('subscriber');
  });

  it('should get preference from template when subscriber preference are empty', async () => {
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
    expect(overrides.find((override) => override.channel === 'email').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'sms').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'in_app').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'chat').source).toEqual('template');
    expect(overrides.find((override) => override.channel === 'push').source).toEqual('template');
  });
});

describe('filteredPreference', () => {
  it('should filter active channels in the preference ', async () => {
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

  it('should filter all if no active channels ', async () => {
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

  it('should not filter preference if all the channels are active', async () => {
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

describe('buildDefaultPreferenceChannels', () => {
  it('includes tool when the tool channel flag is enabled', () => {
    expect(buildDefaultPreferenceChannels({ isToolChannelEnabled: true })).toEqual({
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
      tool: true,
    });
  });

  it('omits tool when the tool channel flag is disabled', () => {
    expect(buildDefaultPreferenceChannels({ isToolChannelEnabled: false })).toEqual({
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
  });
});

describe('filterPreferenceChannelsByFeatureFlags', () => {
  const channels = {
    email: true,
    sms: false,
    in_app: true,
    chat: true,
    push: true,
    tool: true,
  };

  it('keeps tool when the tool channel flag is enabled', () => {
    expect(filterPreferenceChannelsByFeatureFlags(channels, { isToolChannelEnabled: true })).toEqual(channels);
  });

  it('omits tool when the tool channel flag is disabled', () => {
    expect(filterPreferenceChannelsByFeatureFlags(channels, { isToolChannelEnabled: false })).toEqual({
      email: true,
      sms: false,
      in_app: true,
      chat: true,
      push: true,
    });
  });

  it('returns channels unchanged when tool is already absent and the flag is disabled', () => {
    const withoutTool = {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };

    expect(filterPreferenceChannelsByFeatureFlags(withoutTool, { isToolChannelEnabled: false })).toEqual(withoutTool);
  });
});

describe('filterWorkflowPreferencesByFeatureFlags', () => {
  const workflowPreferences = {
    all: { enabled: true, readOnly: false },
    channels: {
      email: { enabled: true },
      sms: { enabled: true },
      in_app: { enabled: true },
      chat: { enabled: true },
      push: { enabled: true },
      tool: { enabled: true },
    },
  };

  it('keeps tool when the tool channel flag is enabled', () => {
    expect(filterWorkflowPreferencesByFeatureFlags(workflowPreferences, { isToolChannelEnabled: true })).toEqual(
      workflowPreferences
    );
  });

  it('omits tool from channels when the tool channel flag is disabled', () => {
    expect(filterWorkflowPreferencesByFeatureFlags(workflowPreferences, { isToolChannelEnabled: false })).toEqual({
      all: { enabled: true, readOnly: false },
      channels: {
        email: { enabled: true },
        sms: { enabled: true },
        in_app: { enabled: true },
        chat: { enabled: true },
        push: { enabled: true },
      },
    });
  });

  it('returns null when preferences are null', () => {
    expect(filterWorkflowPreferencesByFeatureFlags(null, { isToolChannelEnabled: false })).toBeNull();
  });
});
