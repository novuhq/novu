import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_PREFERENCES } from './preferences.const';

describe('DEFAULT_WORKFLOW_PREFERENCES', () => {
  it('includes a signals channel preference key', () => {
    expect(DEFAULT_WORKFLOW_PREFERENCES.channels).toHaveProperty('signals');
    expect(DEFAULT_WORKFLOW_PREFERENCES.channels.signals).toEqual({ enabled: true });
  });
});
