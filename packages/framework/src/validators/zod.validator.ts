import { JSONSchema } from 'json-schema-to-ts';
import { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Schema } from '../types/schema.types';
import { ValidateResult, Validator } from '../types/validator.types';

export class ZodValidator implements Validator<ZodSchema> {
  isSchema(schema: Schema): schema is ZodSchema {
    return (schema as ZodSchema).safeParseAsync !== undefined;
  }

  async validate<T>(data: T, schema: ZodSchema): Promise<ValidateResult<T>> {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.errors.map((err) => ({
          path: err.path.join(),
          message: err.message,
        })),
      };
    }
  }

  transformToJsonSchema(schema: ZodSchema): JSONSchema {
    // @ts-expect-error - JSONSchema7 is incompatible with Zod's JSONSchema typings
    return zodToJsonSchema(schema);
  }
}
