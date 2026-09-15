import { describe, expect, it } from 'vitest';
import { getOperatorsForFieldType } from '@/components/conditions-editor/field-type-operators';
import { mergeIntegrationConditionVariables } from './integration-conditions';

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
        dataType: 'object',
        format: undefined,
        inputType: undefined,
      },
    ]);
    expect(getOperatorsForFieldType(variables[0].dataType)).toEqual([
      { name: 'null', label: 'is null' },
      { name: 'notNull', label: 'is not null' },
    ]);
  });
});
