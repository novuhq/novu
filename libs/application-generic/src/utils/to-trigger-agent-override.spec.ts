import { toTriggerAgentOverride } from './to-trigger-agent-override';

describe('toTriggerAgentOverride', () => {
  it('should return undefined when agentId is omitted', () => {
    expect(toTriggerAgentOverride(undefined)).toBeUndefined();
  });

  it('should return null when agentId is null', () => {
    expect(toTriggerAgentOverride(null)).toBeNull();
  });

  it('should map a string agentId to the internal identifier shape', () => {
    expect(toTriggerAgentOverride('support-agent')).toEqual({ identifier: 'support-agent' });
  });
});
