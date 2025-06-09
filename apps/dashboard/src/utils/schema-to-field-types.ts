import type { Field } from 'react-querybuilder';
import type { JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';

export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';

export interface EnhancedField extends Field {
  dataType: FieldDataType;
  inputType?: string;
  format?: string;
}

export function mapJsonSchemaTypeToFieldType(schemaProperty: JSONSchemaDefinition | JSONSchema7): FieldDataType {
  if (typeof schemaProperty === 'boolean') return 'string';

  const { type, format } = schemaProperty;

  switch (type) {
    case 'string':
      if (format === 'date') return 'date';
      if (format === 'date-time') return 'datetime';
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

export function getInputTypeFromSchema(schemaProperty: JSONSchemaDefinition | JSONSchema7): string {
  if (typeof schemaProperty === 'boolean') return 'text';

  const { type, format } = schemaProperty;

  switch (type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'string':
      if (format === 'date') return 'date';
      if (format === 'date-time') return 'datetime-local';
      if (format === 'email') return 'email';
      return 'text';
    default:
      return 'text';
  }
}
