import type { FromSchema, FromSchemaUnvalidated, Schema, JsonSchema, ZodSchema } from '../types/schema.types';
import type { ValidateResult } from '../types/validator.types';
import { JsonSchemaValidator } from './json-schema.validator';
import { ZodValidator } from './zod.validator';

const zodValidator = new ZodValidator();
const jsonSchemaValidator = new JsonSchemaValidator();

/**
 * Validate data against a schema.
 *
 * @param schema - The schema to validate the data against.
 * @param data - The data to validate.
 * @returns The validated data.
 */
export const validateData = async <
  T_Schema extends Schema = Schema,
  T_Unvalidated extends Record<string, unknown> = FromSchemaUnvalidated<T_Schema>,
  T_Validated extends Record<string, unknown> = FromSchema<T_Schema>,
>(
  schema: T_Schema,
  data: T_Unvalidated
): Promise<ValidateResult<T_Validated>> => {
  /**
   * TODO: Replace type coercion with async type guard when available.
   *
   * @see https://github.com/microsoft/typescript/issues/37681
   */
  if (await zodValidator.canHandle(schema)) {
    return zodValidator.validate(data, schema as ZodSchema);
  } else if (await jsonSchemaValidator.canHandle(schema)) {
    return jsonSchemaValidator.validate(data, schema as JsonSchema);
  }

  throw new Error('Invalid schema');
};

/**
 * Transform a schema to a JSON schema.
 *
 * @param schema - The schema to transform.
 * @returns The transformed JSON schema.
 */
export const transformSchema = async (schema: Schema): Promise<JsonSchema> => {
  if (await zodValidator.canHandle(schema)) {
    return zodValidator.transformToJsonSchema(schema as ZodSchema);
  } else if (await jsonSchemaValidator.canHandle(schema)) {
    return jsonSchemaValidator.transformToJsonSchema(schema as JsonSchema);
  }

  throw new Error('Invalid schema');
};
