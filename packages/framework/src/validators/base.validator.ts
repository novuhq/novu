import type { JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult } from '../types/validator.types';
import { JsonSchemaValidator } from './json-schema.validator';
import { ZodValidator } from './zod.validator';

const validators = [new ZodValidator(), new JsonSchemaValidator()];

export const validateData = async <T>(schema: Schema, data: T): Promise<ValidateResult<T>> => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      return validator.validate(data, schema as any);
    }
  }

  throw new Error('Invalid schema');
};

export const transformSchema = (schema: Schema): JsonSchema => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      return validator.transformToJsonSchema(schema as any);
    }
  }

  throw new Error('Invalid schema');
};
