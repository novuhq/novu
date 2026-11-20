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

/**
 * The subset of a Zod v4 `toJSONSchema` override context used to keep the output aligned
 * with what `zod-to-json-schema` produces for Zod v3 schemas.
 */
type ZodV4JsonSchemaOverrideContext = {
  zodSchema: { _zod: { def: { type: string; catchall?: unknown } } };
  jsonSchema: Record<string, unknown>;
};

type ZodV4SchemaWithJsonSchema = {
  _zod: unknown;
  toJSONSchema: (params: {
    target: 'draft-7';
    io: 'input';
    unrepresentable: 'any';
    override: (ctx: ZodV4JsonSchemaOverrideContext) => void;
  }) => Record<string, unknown>;
};

/**
 * Zod v4 schemas (from `zod@4` or the `zod/v4` subpath of `zod@3.25`) carry their internals on `_zod`.
 * Zod v3 schemas carry them on `_def` only.
 */
const isZodV4Schema = (schema: unknown): schema is { _zod: unknown } =>
  typeof schema === 'object' && schema !== null && '_zod' in schema;

const hasNativeJsonSchema = (schema: unknown): schema is ZodV4SchemaWithJsonSchema =>
  isZodV4Schema(schema) && typeof (schema as { toJSONSchema?: unknown }).toJSONSchema === 'function';

/**
 * Convert a Zod v4 schema with Zod's built-in converter.
 *
 * `zod-to-json-schema` only understands Zod v3 schemas and silently returns an empty schema
 * for Zod v4 ones, so v4 schemas must use the native converter. The options keep the output
 * in line with what `zod-to-json-schema` produces for v3 schemas:
 * - `draft-7` matches the `$schema` that `zod-to-json-schema` emits by default.
 * - `io: 'input'` keeps fields with a `.default()` optional, as they are in v3.
 * - objects that strip unknown keys get `additionalProperties: false`, as they do in v3.
 */
const transformZodV4ToJsonSchema = (schema: ZodV4SchemaWithJsonSchema): JsonSchema => {
  return schema.toJSONSchema({
    target: 'draft-7',
    io: 'input',
    unrepresentable: 'any',
    override: ({ zodSchema, jsonSchema }) => {
      const { def } = zodSchema._zod;
      if (def.type === 'object' && def.catchall === undefined && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false;
      }
      // Zod v4 emits `oneOf` for discriminated unions where `zod-to-json-schema` emitted `anyOf`.
      if (def.type === 'union' && jsonSchema.oneOf !== undefined && jsonSchema.anyOf === undefined) {
        jsonSchema.anyOf = jsonSchema.oneOf;
        delete jsonSchema.oneOf;
      }
    },
  }) as JsonSchema;
};

export class ZodValidator implements Validator<ZodSchema> {
  readonly requiredImports: readonly ImportRequirement[] = [
    {
      name: 'zod',
      import: import('zod'),
      exports: ['ZodType'],
    },
  ];

  /**
   * `zod-to-json-schema` is only needed to convert Zod v3 schemas. Zod v4 schemas are converted
   * with Zod's own converter, so v4 users don't need to install it.
   */
  readonly zodV3JsonSchemaImports: readonly ImportRequirement[] = [
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
    if (hasNativeJsonSchema(schema)) {
      return transformZodV4ToJsonSchema(schema);
    }

    if (isZodV4Schema(schema)) {
      throw new Error(
        'This Zod v4 schema does not support JSON Schema conversion. Upgrade `zod` to 4.6.6 or later, or use the classic `zod` API instead of `zod/mini`.'
      );
    }

    await checkDependencies(this.zodV3JsonSchemaImports, 'Zod v3 schema');
    const { zodToJsonSchema } = await import('zod-to-json-schema');

    // TODO: zod-to-json-schema is not using JSONSchema7
    return zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0]) as JsonSchema;
  }
}
