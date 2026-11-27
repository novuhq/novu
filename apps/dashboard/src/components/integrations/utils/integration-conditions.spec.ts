import { describe, expect, it } from 'vitest';
import { INTEGRATION_CONDITION_VARIABLES, isAllowedIntegrationConditionVariable } from './integration-conditions';

describe('workflow condition variables', () => {
  it('exposes the workflow fields supported at delivery time', () => {
    expect(INTEGRATION_CONDITION_VARIABLES.filter((variable) => variable.name.startsWith('workflow.'))).toEqual([
      expect.objectContaining({ name: 'workflow.workflowId', dataType: 'string' }),
      expect.objectContaining({ name: 'workflow.name', dataType: 'string' }),
      expect.objectContaining({ name: 'workflow.description', dataType: 'string' }),
      expect.objectContaining({ name: 'workflow.tags', dataType: 'array' }),
      expect.objectContaining({ name: 'workflow.severity', dataType: 'string' }),
    ]);
    expect(isAllowedIntegrationConditionVariable({ name: 'workflow.name' })).toBe(true);
    expect(isAllowedIntegrationConditionVariable({ name: 'workflow.internalField' })).toBe(false);
  });
});

describe('integration condition variable boundaries', () => {
  it('allows context and subscriber fields but rejects payload fields', () => {
    expect(isAllowedIntegrationConditionVariable({ name: 'context.tenant.data.plan' })).toBe(true);
    expect(isAllowedIntegrationConditionVariable({ name: 'subscriber.data.region' })).toBe(true);
    expect(isAllowedIntegrationConditionVariable({ name: 'payload.region' })).toBe(false);
  });
});
