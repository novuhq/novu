import { describe, expect, it } from 'vitest';

import {
  agentPagePairs,
  CHANNEL_IDS,
  hasAgentPage,
  isChannelId,
  otherAgentChannels,
  setupSteps,
} from './channel-pages';

describe('channel landing route contracts', () => {
  it('publishes exactly the three channels and eight agent pairs in the brief', () => {
    expect(CHANNEL_IDS).toEqual(['email', 'telegram', 'slack']);
    expect(agentPagePairs().map(({ channel, agent }) => `/${channel}/${agent}`)).toEqual([
      '/email/openclaw',
      '/telegram/openclaw',
      '/telegram/claude-code',
      '/telegram/hermes',
      '/slack/claude-code',
      '/slack/openclaw',
      '/slack/codex',
      '/slack/cursor',
    ]);
  });
  it('keeps unrequested pairs and arbitrary path segments out', () => {
    expect(hasAgentPage('email', 'codex')).toBe(false);
    expect(hasAgentPage('telegram', 'cursor')).toBe(false);
    expect(hasAgentPage('slack', '../settings')).toBe(false);
    expect(isChannelId('unknown')).toBe(false);
  });
  it('cross-links an agent only to published channels', () => {
    expect(otherAgentChannels('telegram', 'openclaw')).toEqual(['email', 'slack']);
    expect(otherAgentChannels('telegram', 'hermes')).toEqual([]);
  });
  it('keeps channel and agent setup instructions distinct', () => {
    expect(setupSteps('telegram')).toHaveLength(3);
    expect(setupSteps('telegram', 'openclaw')).toHaveLength(4);
    expect(setupSteps('slack', 'codex')[2].command).toContain('--agent codex');
    expect(setupSteps('telegram', 'hermes')[2].command).toContain('-g --agent hermes-agent');
    expect(setupSteps('email', 'openclaw')[2].command).toContain('-g --agent openclaw');
  });
});
