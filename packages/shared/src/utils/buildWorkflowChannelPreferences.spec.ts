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
      defaultValue: !WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
      readOnly: !WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
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

  it('should populate the remainder of the object with default values', () => {
    const testPreferences: IncompleteWorkflowChannelPreferences = {
      channels: { in_app: { readOnly: true } },
    };

    const result = buildWorkflowChannelPreferences(testPreferences, testDefaultPreferences);
    expect(result).toEqual({
      ...testDefaultPreferences,
      channels: {
        ...testDefaultPreferences.channels,
        in_app: { ...testDefaultPreferences.channels.in_app, ...testPreferences.channels?.in_app },
      },
    });
  });

  it('should use the `workflow`-level preferences to define defaults for channel-level preferences', () => {
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
