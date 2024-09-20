import { expect, describe, it } from 'vitest';
import { buildWorkflowChannelPreferences } from './buildWorkflowChannelPreferences';
import { ChannelPreference, IncompleteWorkflowChannelPreferences, WorkflowChannelPreferences } from '../types';

const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE = true;
const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY = false;

const DEFAULT_CHANNEL_PREFERENCE: ChannelPreference = {
  defaultValue: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
  readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
};

const testDefaultPreferences: WorkflowChannelPreferences = {
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
      defaultValue: false,
      readOnly: true,
    };

    // opposite of default
    const testPreferences: IncompleteWorkflowChannelPreferences = {
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
      const testPreferences: IncompleteWorkflowChannelPreferences = {
        channels: { in_app: { readOnly: true } },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        ...testDefaultPreferences,
        channels: {
          ...testDefaultPreferences.channels,
          in_app: { defaultValue: true, readOnly: true },
        },
      });
    });

    it('using just a full, single channel', () => {
      const testPreferences: IncompleteWorkflowChannelPreferences = {
        channels: { in_app: { defaultValue: false, readOnly: false } },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        ...testDefaultPreferences,
        channels: {
          ...testDefaultPreferences.channels,
          in_app: { defaultValue: false, readOnly: false },
        },
      });
    });

    it('using a combination of channels and workflow-level preferences', () => {
      const testPreferences: IncompleteWorkflowChannelPreferences = {
        workflow: { defaultValue: true, readOnly: true },
        channels: {
          in_app: { defaultValue: false, readOnly: false },
          chat: { defaultValue: false },
        },
      };

      const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
      expect(result).toEqual({
        workflow: testPreferences.workflow,
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: testPreferences.workflow?.readOnly,
          },
          sms: {
            defaultValue: testPreferences.workflow?.defaultValue,
            readOnly: testPreferences.workflow?.readOnly,
          },
          email: {
            defaultValue: testPreferences.workflow?.defaultValue,
            readOnly: testPreferences.workflow?.readOnly,
          },
          push: {
            defaultValue: testPreferences.workflow?.defaultValue,
            readOnly: testPreferences.workflow?.readOnly,
          },
        },
      });
    });
  });

  it('should use the `workflow`-level preferences to define defaults for all channel-level preferences', () => {
    const expectedDefaultValue = false;
    const testPreferences: IncompleteWorkflowChannelPreferences = {
      workflow: { defaultValue: expectedDefaultValue },
    };

    const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);

    const expectedResult: WorkflowChannelPreferences = {
      workflow: {
        defaultValue: expectedDefaultValue,
        readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
      },
      channels: {
        in_app: {
          defaultValue: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        sms: {
          defaultValue: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        email: {
          defaultValue: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        push: {
          defaultValue: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
        chat: {
          defaultValue: expectedDefaultValue,
          readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});
