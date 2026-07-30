import { resolveEffectiveTriggerAgent } from './resolve-effective-trigger-agent';

describe('resolveEffectiveTriggerAgent', () => {
  const workflowAgent = { identifier: 'workflow-agent' };

  it('inherits the workflow agent when the job agent is omitted', () => {
    expect(resolveEffectiveTriggerAgent(undefined, workflowAgent)).toEqual(workflowAgent);
  });

  it('returns null when the job agent is omitted and the workflow has no agent', () => {
    expect(resolveEffectiveTriggerAgent(undefined, null)).toBeNull();
    expect(resolveEffectiveTriggerAgent(undefined, undefined)).toBeNull();
  });

  it('opts out of agent defaults when the job agent is explicitly null', () => {
    expect(resolveEffectiveTriggerAgent(null, workflowAgent)).toBeNull();
  });

  it('uses the trigger agent override regardless of the workflow agent', () => {
    expect(resolveEffectiveTriggerAgent({ identifier: 'trigger-agent' }, workflowAgent)).toEqual({
      identifier: 'trigger-agent',
    });
  });

  it('uses the trigger agent override when the workflow has no agent', () => {
    expect(resolveEffectiveTriggerAgent({ identifier: 'trigger-agent' }, null)).toEqual({
      identifier: 'trigger-agent',
    });
  });
});
