import { expect, describe, it } from 'vitest';
import { buildWorkflowChannelPreferences } from './buildWorkflowChannelPreferences';
import { ChannelPreference, WorkflowPreferencesPartial, WorkflowPreferences } from '../types';

const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE = true;
const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY = false;

const DEFAULT_CHANNEL_PREFERENCE: ChannelPreference = {
  enabled: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
  readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
};

const testDefaultPreferences: WorkflowPreferences = {
  workflow: DEFAULT_CHANNEL_PREFERENCE,
  channels: {
    in_app: DEFAULT_CHANNEL_PREFERENCE,
    sms: DEFAULT_CHANNEL_PREFERENCE,
    email: DEFAULT_CHANNEL_PREFERENCE,
    push: DEFAULT_CHANNEL_PREFERENCE,
    chat: DEFAULT_CHANNEL_PREFERENCE,
  },
};

describe('buildWorkflowChannelPreferences', () => {
  it('should return the defaults if input is undefined', () => {
    const result = buildWorkflowChannelPreferences(undefined, testDefaultPreferences);
    expect(result).toEqual(testDefaultPreferences);
  });

  it('should return the input object if a complete preferences object is supplied', () => {
    const testPreference: ChannelPreference = {
      enabled: false,
      readOnly: true,
    };

    // opposite of default
    const testPreferences: WorkflowPreferencesPartial = {
      workflow: testPreference,
      channels: {
        in_app: testPreference,
        sms: testPreference,
        email: testPreference,
        push: testPreference,
        chat: testPreference,
      },
    };

    const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
    expect(result).toEqual(testPreferences);
  });

  describe('should populate the remainder of the object with default values', () => {
    it('using just a single, partial channel with readOnly', () => {
      const testPreferences: WorkflowPreferencesPartial = {
        channels: { in_app: { readOnly: true } },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        ...testDefaultPreferences,
        channels: {
          ...testDefaultPreferences.channels,
          in_app: { enabled: true, readOnly: true },
        },
      });
    });

    it('using just a full, single channel', () => {
      const testPreferences: WorkflowPreferencesPartial = {
        channels: { in_app: { enabled: false, readOnly: false } },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        ...testDefaultPreferences,
        channels: {
          ...testDefaultPreferences.channels,
          in_app: { enabled: false, readOnly: false },
        },
      });
    });

    it('using a combination of channels and workflow-level preferences', () => {
      const testPreferences: WorkflowPreferencesPartial = {
        workflow: { enabled: true, readOnly: true },
        channels: {
          in_app: { enabled: false, readOnly: false },
          chat: { enabled: false },
        },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        workflow: testPreferences.workflow,
        channels: {
          in_app: {
            enabled: false,
            readOnly: false,
          },
          chat: {
            enabled: false,
            readOnly: testPreferences.workflow?.readOnly,
          },
          sms: {
            enabled: testPreferences.workflow?.enabled,
            readOnly: testPreferences.workflow?.readOnly,
          },
          email: {
            enabled: testPreferences.workflow?.enabled,
            readOnly: testPreferences.workflow?.readOnly,
          },
          push: {
            enabled: testPreferences.workflow?.enabled,
            readOnly: testPreferences.workflow?.readOnly,
          },
        },
      });
    });
  });

  it('should use the `workflow`-level preferences to define defaults for all channel-level preferences', () => {
    const expectedDefaultValue = false;
    const testPreferences: WorkflowPreferencesPartial = {
      workflow: { enabled: expectedDefaultValue },
    };

    const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);

    const expectedResult: WorkflowPreferences = {
      workflow: {
        enabled: expectedDefaultValue,
        readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
      },
      channels: {
        in_app: {
          enabled: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        sms: {
          enabled: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        email: {
          enabled: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        push: {
          enabled: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        chat: {
          enabled: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});
