/**
 * The primitive types for JSON Schema.
 */
export type JSONSchemaTypeName = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/**
 * All possible types for JSON Schema.
 */
export type JSONSchemaType = string | number | boolean | JSONSchemaObject | JSONSchemaArray | null;

/**
 * The object type for JSON Schema.
 */
export type JSONSchemaObject = {
  [key: string]: JSONSchemaType;
};

/**
 * The array type for JSON Schema.
 */
export type JSONSchemaArray = Array<JSONSchemaType>;

/**
 * The definition type for JSON Schema.
 */
export type JSONSchemaDefinition = JSONSchemaDto | boolean;

/**
 * Json schema version 7.
 */
export type JSONSchemaDto = {
  $ref?: string | undefined;
  type?: JSONSchemaTypeName | JSONSchemaTypeName[] | undefined;
  enum?: unknown | undefined;
  const?: unknown | undefined;
  multipleOf?: number | undefined;
  format?: string | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: number | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: number | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
  items?: JSONSchemaDefinition | JSONSchemaDefinition[] | undefined;
  additionalItems?: JSONSchemaDefinition | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  contains?: JSONSchemaDefinition | undefined;
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: string[] | undefined;
  properties?:
    | {
        [key: string]: JSONSchemaDefinition;
      }
    | undefined;
  patternProperties?:
    | {
        [key: string]: JSONSchemaDefinition;
      }
    | undefined;
  additionalProperties?: JSONSchemaDefinition | undefined;
  dependencies?:
    | {
        [key: string]: JSONSchemaDefinition | string[];
      }
    | undefined;
  propertyNames?: JSONSchemaDefinition | undefined;
  if?: JSONSchemaDefinition | undefined;
  then?: JSONSchemaDefinition | undefined;
  else?: JSONSchemaDefinition | undefined;
  allOf?: JSONSchemaDefinition[] | undefined;
  anyOf?: JSONSchemaDefinition[] | undefined;
  oneOf?: JSONSchemaDefinition[] | undefined;
  not?: JSONSchemaDefinition | undefined;
  definitions?:
    | Readonly<{
        [key: string]: JSONSchemaDefinition;
      }>
    | undefined;
  title?: string | undefined;
  description?: string | undefined;
  default?: unknown | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: unknown[] | undefined;
};
