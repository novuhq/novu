import { describe, expect, it } from 'vitest';

import { buildAgentConnectionIdentifier, buildConnectSubscriberId } from './connect-subscriber-id';

describe('connect-subscriber-id', () => {
  it('buildConnectSubscriberId prefixes the dashboard user id', () => {
    expect(buildConnectSubscriberId('user_abc')).toBe('connect:user_abc');
  });

  it('buildAgentConnectionIdentifier scopes connect subscribers to an agent', () => {
    expect(buildAgentConnectionIdentifier('user_abc', 'agent_xyz')).toBe('connect:user_abc:agent:agent_xyz');
  });
});
