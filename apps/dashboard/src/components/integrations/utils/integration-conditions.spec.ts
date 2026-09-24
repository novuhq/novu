import { describe, expect, it } from 'vitest';
import { getOperatorsForFieldType } from '@/components/conditions-editor/field-type-operators';
import {
  buildPayloadConditionVariables,
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

describe('buildPayloadConditionVariables', () => {
  it('extracts typed payload fields from workflow schemas', () => {
    const variables = buildPayloadConditionVariables([
      {
        type: 'object',
        properties: {
          region: { type: 'string' },
          retries: { type: 'number' },
        },
      },
    ]);

    expect(variables).toEqual([
      expect.objectContaining({ name: 'payload.region', dataType: 'string' }),
      expect.objectContaining({ name: 'payload.retries', dataType: 'number' }),
    ]);
  });
});

describe('mergeIntegrationConditionVariables', () => {
  it('deduplicates matching payload variable types', () => {
    const variables = mergeIntegrationConditionVariables([
      { name: 'payload.region', dataType: 'string' },
      { name: 'payload.region', dataType: 'string' },
    ]);

    expect(variables).toEqual([{ name: 'payload.region', dataType: 'string' }]);
  });

  it('marks conflicting payload variable types as mixed', () => {
    const variables = mergeIntegrationConditionVariables([
      { name: 'payload.priority', dataType: 'number', inputType: 'number' },
      { name: 'payload.priority', dataType: 'string', inputType: 'text' },
    ]);

    expect(variables).toEqual([
      {
        name: 'payload.priority',
        displayLabel: 'payload.priority (mixed types)',
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
