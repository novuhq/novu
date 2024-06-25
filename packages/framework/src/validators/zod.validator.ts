import { ZodSchema } from 'zod';
import { JsonSchema, Schema } from '../types/schema.types';
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
          path: `/${err.path.join('/')}`,
          message: err.message,
        })),
      };
    }
  }

  transformToJsonSchema(schema: ZodSchema): JsonSchema {
    try {
      const module = require('zod-to-json-schema');

      return module.zodToJsonSchema(schema);
    } catch (error) {
      if ((error as Error)?.message?.includes('Cannot find module')) {
        // eslint-disable-next-line no-console
        console.error(
          'Tried to use a zod schema in @novu/framework without `zod-to-json-schema` installed. ' +
            'Please install it by running `npm install zod-to-json-schema`.'
        );
      }
      throw error;
    }
  }
}
