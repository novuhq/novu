import { describe, expect, it } from 'vitest';
import type { ConditionFieldDataType } from '@/components/conditions-editor/types';
import { getHelpTextForField } from './field-type-editors';
import { getOperatorsForFieldType } from './field-type-operators';

const DATA_TYPES: ConditionFieldDataType[] = ['string', 'number', 'boolean', 'date', 'datetime', 'array', 'object'];

const helpTexts = DATA_TYPES.flatMap((dataType) =>
  getOperatorsForFieldType(dataType).map(({ name: operator }) => {
    const fieldData = { name: 'field', label: 'field', value: 'field', dataType };

    return {
      operator,
      dataType,
      withDynamicValues: getHelpTextForField(operator, { fieldData }),
      literalOnly: getHelpTextForField(operator, { fieldData, allowDynamicValues: false }),
    };
  })
);

describe('condition help text', () => {
  it('offers payload values only where the editor allows dynamic values', () => {
    expect(helpTexts.some(({ withDynamicValues }) => withDynamicValues.description.includes('payload'))).toBe(true);

    for (const { operator, dataType, literalOnly } of helpTexts) {
      const text = [literalOnly.description, ...literalOnly.examples].join('\n');

      expect(text, `${dataType} ${operator}`).not.toMatch(/dynamic values|\{\{/);
    }
  });
});
