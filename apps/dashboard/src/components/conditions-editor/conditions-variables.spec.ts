import { describe, expect, it } from 'vitest';
import { mergeConditionVariables } from '@/components/conditions-editor/conditions-variables';
import { getOperatorsForFieldType } from '@/components/conditions-editor/field-type-operators';

describe('mergeConditionVariables', () => {
  it('deduplicates matching variable types', () => {
    const variables = mergeConditionVariables([
      { name: 'context.tenant.data.region', dataType: 'string' },
      { name: 'context.tenant.data.region', dataType: 'string' },
    ]);

    expect(variables).toEqual([{ name: 'context.tenant.data.region', dataType: 'string' }]);
  });

  it('marks conflicting variable types as mixed', () => {
    const variables = mergeConditionVariables([
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
