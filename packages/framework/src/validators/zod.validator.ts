import { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { FromSchema, FromSchemaUnvalidated, JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult, Validator } from '../types/validator.types';

export class ZodValidator implements Validator<ZodSchema> {
  canHandle(schema: Schema): schema is ZodSchema {
    return (schema as ZodSchema).safeParseAsync !== undefined;
  }

  async validate<
    T_Schema extends ZodSchema = ZodSchema,
    T_Unvalidated = FromSchemaUnvalidated<T_Schema>,
    T_Validated = FromSchema<T_Schema>,
  >(data: T_Unvalidated, schema: T_Schema): Promise<ValidateResult<T_Validated>> {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data as T_Validated };
    } else {
      return {
        success: false,
        errors: result.error.errors.map((err) => ({
          path: `/${err.path.join('/')}`,
          message: err.message,
        })),
      };
    }
  }

  transformToJsonSchema(schema: ZodSchema): JsonSchema {
    // @ts-expect-error - zod-to-json-schema is not using JSONSchema7
    return zodToJsonSchema(schema);
  }
}
