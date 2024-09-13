import { buildWorkflowChannelPreferences } from './buildWorkflowChannelPreferences';
import { IncompleteWorkflowChannelPreferences, WorkflowChannelPreferences } from '../types';

const fullPreferences: WorkflowChannelPreferences = {
  workflow: {
    defaultValue: true,
    readOnly: false,
  },
  channels: {
    in_app: {
      defaultValue: true,
      readOnly: false,
    },
    sms: {
      defaultValue: true,
      readOnly: false,
    },
    email: {
      defaultValue: true,
      readOnly: false,
    },
    push: {
      defaultValue: true,
      readOnly: false,
    },
    chat: {
      defaultValue: true,
      readOnly: false,
    },
  },
};

describe('buildWorkflowChannelPreferences', () => {
  it('should return the input object if a complete preferences object is supplied', () => {
    const testPreferences: IncompleteWorkflowChannelPreferences = { ...fullPreferences };

    const result = buildWorkflowChannelPreferences(testPreferences);
    expect(result).toEqual(testPreferences);
  });

  it('should populate the remainder of the object with default values', () => {
    const testPreferences: IncompleteWorkflowChannelPreferences = {
      channels: { in_app: { readOnly: true, defaultValue: false } },
    };

    const result = buildWorkflowChannelPreferences(testPreferences);
    expect(result).toEqual(testPreferences);
  });
});
