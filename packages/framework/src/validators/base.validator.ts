import type { JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult } from '../types/validator.types';
import { JsonSchemaValidator } from './json-schema.validator';
import { ZodValidator } from './zod.validator';

const validators = [new ZodValidator(), new JsonSchemaValidator()];

export const validateData = async <T extends Record<string, unknown>>(
  schema: Schema,
  data: T
): Promise<ValidateResult<T>> => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      // TODO: fix validator type guards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return validator.validate(data, schema as any);
    }
  }

  throw new Error('Invalid schema');
};

export const transformSchema = (schema: Schema): JsonSchema => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      // TODO: fix validator type guards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return validator.transformToJsonSchema(schema as any);
    }
  }

  throw new Error('Invalid schema');
};
