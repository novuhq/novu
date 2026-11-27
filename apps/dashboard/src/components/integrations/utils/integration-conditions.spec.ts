import type { RuleGroupType } from 'react-querybuilder';
import { describe, expect, it } from 'vitest';
import {
  INTEGRATION_CONDITION_VARIABLES,
  isAllowedIntegrationConditionVariable,
  parseIntegrationRules,
  toIntegrationRules,
} from './integration-conditions';

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

describe('opening integration rules written through the API', () => {
  it('reports a notIn rule as not editable instead of shortening it on the next edit', () => {
    const stored = { notIn: [{ var: 'subscriber.email' }, ['a@x.com']] };

    expect(parseIntegrationRules(stored)).toBeNull();
  });

  it('saves an editable rule unchanged', () => {
    const stored = { and: [{ '==': [{ var: 'subscriber.data.region' }, 'eu'] }] };
    const opened = parseIntegrationRules(stored);

    expect(opened).not.toBeNull();
    expect(toIntegrationRules(opened as RuleGroupType)).toEqual(stored);
  });
});
