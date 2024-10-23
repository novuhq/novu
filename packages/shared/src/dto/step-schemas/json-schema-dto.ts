export type JSONSchemaTypeName = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export type JSONSchemaType = string | number | boolean | JSONSchemaObject | JSONSchemaArray | null;

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface JSONSchemaObject {
  [key: string]: JSONSchemaType;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface JSONSchemaArray extends Array<JSONSchemaType> {}

export type JSONSchemaVersion = string;

export type JSONSchemaDefinition = JSONSchemaDto | boolean;

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface JSONSchemaDto {
  type?: JSONSchemaTypeName | JSONSchemaTypeName[] | undefined;
  enum?: JSONSchemaType[] | undefined;
  const?: JSONSchemaType | undefined;
  multipleOf?: number | undefined;
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
    | {
        [key: string]: JSONSchemaDefinition;
      }
    | undefined;
  title?: string | undefined;
  description?: string | undefined;
  default?: JSONSchemaType | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: JSONSchemaType | undefined;
}
