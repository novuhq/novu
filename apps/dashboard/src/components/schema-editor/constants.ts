import type { JSONSchema7TypeName } from './json-schema';

export interface SchemaTypeOption {
  label: string;
  value: JSONSchema7TypeName | 'enum';
}

export const SCHEMA_TYPE_OPTIONS: SchemaTypeOption[] = [
  { label: 'String', value: 'string' },
  { label: 'Integer', value: 'integer' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Enum', value: 'enum' },
  { label: 'Array', value: 'array' },
  { label: 'Object', value: 'object' },
  { label: 'Null', value: 'null' },
];

export const MAX_NESTING_DEPTH = 7;
