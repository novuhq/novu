import { buildWorkflowChannelPreferences } from './buildWorkflowChannelPreferences';
import { WorkflowChannelPreferences } from '../types';

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
    const testPreferences = { ...fullPreferences };

    const result = buildWorkflowChannelPreferences(testPreferences);
    expect(result).toEqual(testPreferences);
  });
});
