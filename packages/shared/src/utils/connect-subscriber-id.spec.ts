import { describe, expect, it } from 'vitest';
import { buildAgentConnectionIdentifier, buildConnectSubscriberId } from './connect-subscriber-id';

describe('connect-subscriber-id', () => {
  it('buildConnectSubscriberId is an identity (deprecated)', () => {
    expect(buildConnectSubscriberId('user_abc')).toBe('user_abc');
  });

  it('buildAgentConnectionIdentifier scopes connections to an agent', () => {
    expect(buildAgentConnectionIdentifier('user_abc', 'agent_xyz')).toBe('user_abc:agent:agent_xyz');
  });
});
