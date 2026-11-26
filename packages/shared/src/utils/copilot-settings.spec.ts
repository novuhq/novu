import { describe, expect, it } from 'vitest';
import { resolveCopilotSettings } from './copilot-settings';

describe('resolveCopilotSettings', () => {
  it('turns every switch on for an organization that never set them', () => {
    expect(resolveCopilotSettings(undefined)).toEqual({
      dashboardEnabled: true,
      slackEnabled: true,
      editsEnabled: true,
    });
    expect(resolveCopilotSettings(null)).toEqual(resolveCopilotSettings({}));
  });

  it('keeps the switches an admin turned off, and only those', () => {
    expect(resolveCopilotSettings({ slackEnabled: false })).toEqual({
      dashboardEnabled: true,
      slackEnabled: false,
      editsEnabled: true,
    });
  });
});
