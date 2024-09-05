import type { FromSchema, FromSchemaUnvalidated, JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult } from '../types/validator.types';
import { JsonSchemaValidator } from './json-schema.validator';
import { ZodValidator } from './zod.validator';

const zodValidator = new ZodValidator();
const jsonSchemaValidator = new JsonSchemaValidator();

export const validateData = async <
  T_Schema extends Schema = Schema,
  T_Unvalidated extends Record<string, unknown> = FromSchemaUnvalidated<T_Schema>,
  T_Validated extends Record<string, unknown> = FromSchema<T_Schema>,
>(
  schema: T_Schema,
  data: T_Unvalidated
): Promise<ValidateResult<T_Validated>> => {
  if (zodValidator.canHandle(schema)) {
    return zodValidator.validate(data, schema);
  } else if (jsonSchemaValidator.canHandle(schema)) {
    return jsonSchemaValidator.validate(data, schema);
  }

  throw new Error('Invalid schema');
};

export const transformSchema = (schema: Schema): JsonSchema => {
  if (zodValidator.canHandle(schema)) {
    return zodValidator.transformToJsonSchema(schema);
  } else if (jsonSchemaValidator.canHandle(schema)) {
    return jsonSchemaValidator.transformToJsonSchema(schema);
  }

  throw new Error('Invalid schema');
};
