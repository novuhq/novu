import { describe, expect, it } from 'vitest';
import { validateSlackConfigTokenFormat } from './slack-config-token';

describe('validateSlackConfigTokenFormat', () => {
  it('accepts an App Configuration Token', () => {
    expect(validateSlackConfigTokenFormat('xoxe.xoxp-test-config-token')).toBeUndefined();
  });

  it('rejects a bot token', () => {
    expect(validateSlackConfigTokenFormat('xoxb-test-bot-token')).toContain('bot token');
  });

  it('rejects a bare user token', () => {
    expect(validateSlackConfigTokenFormat('xoxp-test-user-token')).toContain('user token');
  });

  it('rejects an app-level token', () => {
    expect(validateSlackConfigTokenFormat('xapp-1-test-app-token')).toContain('app-level');
  });
});
