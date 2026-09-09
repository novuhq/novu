import { ImportRequirement } from '../types/import.types';
import type {
  FromSchema,
  FromSchemaUnvalidated,
  JsonSchema,
  Schema,
  ZodSchema,
  ZodSchemaMinimal,
} from '../types/schema.types';
import type { ValidateResult, Validator } from '../types/validator.types';
import { checkDependencies } from '../utils/import.utils';

export class ZodValidator implements Validator<ZodSchema> {
  readonly requiredImports: readonly ImportRequirement[] = [
    {
      name: 'zod',
      import: import('zod'),
      exports: ['ZodType'],
    },
    {
      name: 'zod-to-json-schema',
      import: import('zod-to-json-schema'),
      exports: ['zodToJsonSchema'],
    },
  ];

  async canHandle(schema: Schema): Promise<boolean> {
    const canHandle = (schema as ZodSchemaMinimal).safeParseAsync !== undefined;

    if (canHandle) {
      await checkDependencies(this.requiredImports, 'Zod schema');
    }

    return canHandle;
  }

  async validate<
    T_Schema extends ZodSchema = ZodSchema,
    T_Unvalidated = FromSchemaUnvalidated<T_Schema>,
    T_Validated = FromSchema<T_Schema>,
  >(data: T_Unvalidated, schema: T_Schema): Promise<ValidateResult<T_Validated>> {
    const result = await schema.safeParseAsync(data);
    if (result.success) {
      return { success: true, data: result.data as T_Validated };
    } else {
      return {
        success: false,
        errors: result.error.issues.map((err) => ({
          path: `/${err.path.join('/')}`,
          message: err.message,
        })),
      };
    }
  }

  async transformToJsonSchema(schema: ZodSchema): Promise<JsonSchema> {
    if ('_zod' in schema) {
      // Zod v4 schemas store their internals under `_zod` and are not supported
      // by zod-to-json-schema, which walks v3 internals only.
      const { toJSONSchema } = await import('zod/v4/core');

      // `io: 'input'` converts the input side of the schema so that schemas
      // with transforms/pipes describe what clients send (and don't throw,
      // as transforms cannot be represented in JSON Schema on the output
      // side) — the same side zod-to-json-schema converts for v3.
      return toJSONSchema(schema as unknown as Parameters<typeof toJSONSchema>[0], {
        target: 'draft-7',
        io: 'input',
      }) as JsonSchema;
    }

    const { zodToJsonSchema } = await import('zod-to-json-schema');

    // TODO: zod-to-json-schema is not using JSONSchema7
    return zodToJsonSchema(schema) as JsonSchema;
  }
}
