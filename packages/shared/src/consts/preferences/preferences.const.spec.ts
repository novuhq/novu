import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_PREFERENCES } from './preferences.const';

describe('DEFAULT_WORKFLOW_PREFERENCES', () => {
  it('includes a tool channel preference key', () => {
    expect(DEFAULT_WORKFLOW_PREFERENCES.channels).toHaveProperty('tool');
    expect(DEFAULT_WORKFLOW_PREFERENCES.channels.tool).toEqual({ enabled: true });
  });
});
