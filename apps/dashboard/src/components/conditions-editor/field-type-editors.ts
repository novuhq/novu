import type { ValueEditorType, Option } from 'react-querybuilder';
import type { EnhancedField } from '@/utils/schema-to-field-types';

export function getValueEditorTypeForField(
  fieldName: string,
  operator: string,
  { fieldData }: { fieldData: EnhancedField }
): ValueEditorType {
  const { dataType } = fieldData;

  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  switch (dataType) {
    case 'boolean':
      return 'select';
    case 'date':
    case 'datetime':
    case 'number':
      return 'text';
    default:
      return 'text';
  }
}

export function getInputTypeForField(
  fieldName: string,
  operator: string,
  { fieldData }: { fieldData: EnhancedField }
): string {
  const { dataType, inputType } = fieldData;

  if (inputType) return inputType;

  switch (dataType) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    default:
      return 'text';
  }
}

export function getValuesForField(
  fieldName: string,
  operator: string,
  { fieldData }: { fieldData: EnhancedField }
): Option[] {
  const { dataType } = fieldData;

  if (dataType === 'boolean') {
    return [
      { name: 'true', label: 'True', value: 'true' },
      { name: 'false', label: 'False', value: 'false' },
    ];
  }

  return [];
}
