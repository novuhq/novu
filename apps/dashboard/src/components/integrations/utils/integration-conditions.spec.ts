import { describe, expect, it } from 'vitest';
import { getOperatorsForFieldType } from '@/components/conditions-editor/field-type-operators';
import {
  INTEGRATION_CONDITION_VARIABLES,
  isAllowedIntegrationConditionVariable,
  mergeIntegrationConditionVariables,
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

describe('mergeIntegrationConditionVariables', () => {
  it('deduplicates matching variable types', () => {
    const variables = mergeIntegrationConditionVariables([
      { name: 'context.tenant.data.region', dataType: 'string' },
      { name: 'context.tenant.data.region', dataType: 'string' },
    ]);

    expect(variables).toEqual([{ name: 'context.tenant.data.region', dataType: 'string' }]);
  });

  it('marks conflicting variable types as mixed', () => {
    const variables = mergeIntegrationConditionVariables([
      { name: 'context.tenant.data.priority', dataType: 'number', inputType: 'number' },
      { name: 'context.tenant.data.priority', dataType: 'string', inputType: 'text' },
    ]);

    expect(variables).toEqual([
      {
        name: 'context.tenant.data.priority',
        displayLabel: 'context.tenant.data.priority (mixed types)',
        dataType: 'mixed',
        format: undefined,
        inputType: undefined,
      },
    ]);
    expect(getOperatorsForFieldType('mixed')).toEqual([
      { name: 'null', label: 'is null' },
      { name: 'notNull', label: 'is not null' },
    ]);
    expect(getOperatorsForFieldType('unknown')).toEqual(getOperatorsForFieldType('mixed'));
  });
});
