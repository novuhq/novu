import { JsonSchemaTypeEnum } from '@novu/dal';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';

export function emptyJsonSchema(): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {},
    additionalProperties: true,
  };
}

export function isMatchingJsonSchema(schema: JSONSchemaDto, obj?: Record<string, unknown> | null): boolean {
  // Ensure the schema is an object with properties
  if (!obj || !schema || typeof schema !== 'object' || schema.type !== 'object' || !schema.properties) {
    return false; // If schema is not structured or no properties are defined, assume match
  }

  // Get the required fields from the schema
  const requiredFields = schema.required ?? [];

  // Check if all required fields are present in the object
  const allRequiredFieldsPresent = requiredFields.every((field) => field in obj);

  if (!allRequiredFieldsPresent) return false;

  // Recursively check required fields for nested objects
  for (const field of requiredFields) {
    const fieldSchema = schema.properties[field];
    const fieldValue = obj[field] as Record<string, unknown> | undefined;

    if (typeof fieldSchema === 'object' && fieldSchema.type === 'object' && fieldSchema.properties) {
      // If a required field is an object, validate its nested structure
      if (!isMatchingJsonSchema(fieldSchema, fieldValue ?? {})) {
        return false;
      }
    }
  }

  return true;
}

export function extractMinValuesFromSchema(schema: JSONSchemaDto): Record<string, number> {
  const result = {};

  if (typeof schema === 'object' && schema.type === 'object') {
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      if (typeof value === 'object' && value.type === 'object' && value.properties) {
        // Recursively handle nested objects
        const nestedResult = extractMinValuesFromSchema(value);
        if (Object.keys(nestedResult).length > 0) {
          result[key] = nestedResult;
        }
      } else if (typeof value === 'object' && value.minimum !== undefined) {
        // Add the minimum value if defined
        result[key] = value.minimum;
      }
    }
  }

  return result;
}
