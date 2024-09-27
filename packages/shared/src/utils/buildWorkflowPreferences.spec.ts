import { expect, describe, it } from 'vitest';
import { buildWorkflowPreferences } from './buildWorkflowPreferences';
import { ChannelPreference, WorkflowPreferencesPartial, WorkflowPreferences, WorkflowPreference } from '../types';

const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE = true;
const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY = false;

const DEFAULT_WORKFLOW_PREFERENCE: WorkflowPreference = {
  enabled: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
  readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
};

const DEFAULT_CHANNEL_PREFERENCE: ChannelPreference = {
  enabled: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
};

const testDefaultPreferences: WorkflowPreferences = {
  all: DEFAULT_WORKFLOW_PREFERENCE,
  channels: {
    in_app: DEFAULT_CHANNEL_PREFERENCE,
    sms: DEFAULT_CHANNEL_PREFERENCE,
    email: DEFAULT_CHANNEL_PREFERENCE,
    push: DEFAULT_CHANNEL_PREFERENCE,
    chat: DEFAULT_CHANNEL_PREFERENCE,
  },
};

describe('buildWorkflowPreferences', () => {
  it('should return the defaults if input is undefined', () => {
    const result = buildWorkflowPreferences(undefined, testDefaultPreferences);
    expect(result).toEqual(testDefaultPreferences);
  });

  it('should return the input object if a complete preferences object is supplied', () => {
    const testWorkflowPreference: WorkflowPreference = {
      enabled: false,
      readOnly: true,
    };

    const testChannelPreference: ChannelPreference = {
      enabled: false,
    };

    // opposite of default
    const testPreferences: WorkflowPreferencesPartial = {
      all: testWorkflowPreference,
      channels: {
        in_app: testChannelPreference,
        sms: testChannelPreference,
        email: testChannelPreference,
        push: testChannelPreference,
        chat: testChannelPreference,
      },
    };

    const result = buildWorkflowPreferences(testPreferences, testDefaultPreferences);
    expect(result).toEqual(testPreferences);
  });

  describe('should populate the remainder of the object with default values', () => {
    it('using just a full, single channel', () => {
      const testPreferences: WorkflowPreferencesPartial = {
        channels: { in_app: { enabled: false } },
      };

      const result = buildWorkflowPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        ...testDefaultPreferences,
        channels: {
          ...testDefaultPreferences.channels,
          in_app: { enabled: false },
        },
      });
    });

    it('using a combination of channels and workflow-level preferences', () => {
      const testPreferences: WorkflowPreferencesPartial = {
        all: { enabled: true, readOnly: true },
        channels: {
          in_app: { enabled: false },
          chat: { enabled: false },
        },
      };

      const result = buildWorkflowPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        all: testPreferences.all,
        channels: {
          in_app: {
            enabled: false,
          },
          chat: {
            enabled: false,
          },
          sms: {
            enabled: testPreferences.all?.enabled,
          },
          email: {
            enabled: testPreferences.all?.enabled,
          },
          push: {
            enabled: testPreferences.all?.enabled,
          },
        },
      });
    });
  });

  it('should use the `workflow`-level preferences to define defaults for all channel-level preferences', () => {
    const expectedDefaultValue = false;
    const testPreferences: WorkflowPreferencesPartial = {
      all: { enabled: expectedDefaultValue },
    };

    const result = buildWorkflowPreferences(testPreferences, testDefaultPreferences);

    const expectedResult: WorkflowPreferences = {
      all: {
        enabled: expectedDefaultValue,
        readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
      },
      channels: {
        in_app: {
          enabled: expectedDefaultValue,
        },
        sms: {
          enabled: expectedDefaultValue,
        },
        email: {
          enabled: expectedDefaultValue,
        },
        push: {
          enabled: expectedDefaultValue,
        },
        chat: {
          enabled: expectedDefaultValue,
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});
