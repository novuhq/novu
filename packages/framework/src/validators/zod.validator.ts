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

type ZodV4JsonSchemaParams = {
  target: 'draft-7';
  io: 'input';
  unrepresentable: 'any';
  override: (ctx: ZodV4JsonSchemaOverrideContext) => void;
};

type ZodV4ToJsonSchema = (schema: unknown, params: ZodV4JsonSchemaParams) => Record<string, unknown>;

/**
 * Zod v4 schemas (from `zod@4` or the `zod/v4` subpath of `zod@3.25`) carry their internals on `_zod`.
 * Zod v3 schemas carry them on `_def` only.
 */
const isZodV4Schema = (schema: unknown): schema is { _zod: unknown } =>
  typeof schema === 'object' && schema !== null && '_zod' in schema;

/**
 * Zod's own converter for a v4 schema. Recent Zod versions put it on the schema; Zod 4.0 to 4.5 only
 * export it from the module as `toJSONSchema`, which the customer's `zod` (already required for Zod
 * schemas) provides.
 */
const getZodV4ToJsonSchema = async (schema: { _zod: unknown }): Promise<ZodV4ToJsonSchema | undefined> => {
  const method = (schema as { toJSONSchema?: unknown }).toJSONSchema;
  if (typeof method === 'function') {
    return (_schema, params) => method.call(schema, params);
  }

  try {
    const zod = (await import('zod')) as { toJSONSchema?: unknown };

    return typeof zod.toJSONSchema === 'function' ? (zod.toJSONSchema as ZodV4ToJsonSchema) : undefined;
  } catch {
    return undefined;
  }
};

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
const transformZodV4ToJsonSchema = (schema: unknown, toJSONSchema: ZodV4ToJsonSchema): JsonSchema => {
  return toJSONSchema(schema, {
    target: 'draft-7',
    io: 'input',
    unrepresentable: 'any',
    override: ({ zodSchema, jsonSchema }) => {
      const { def } = zodSchema._zod;
      if (def.type === 'object' && def.catchall === undefined && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false;
      }
      // Zod v4 bounds `.int()` to the safe-integer range, which `zod-to-json-schema` left implicit.
      if (jsonSchema.type === 'integer') {
        if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
        if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
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
  private warnedAboutLegacyZodV4 = false;

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

  constructor() {
    /*
     * The import above starts eagerly but is only awaited for Zod v3 schemas. Mark it handled so a
     * missing `zod-to-json-schema` doesn't crash Zod v4 users with an unhandled rejection;
     * `checkDependencies` still reports it when a v3 schema needs it.
     */
    for (const dependency of this.zodV3JsonSchemaImports) {
      dependency.import.catch(() => undefined);
    }
  }

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
    if (isZodV4Schema(schema)) {
      const toJSONSchema = await getZodV4ToJsonSchema(schema);
      if (toJSONSchema) {
        return transformZodV4ToJsonSchema(schema, toJSONSchema);
      }

      /*
       * No Zod v4 converter is reachable (the `zod/v4` subpath of `zod@3.25`, where `zod` itself is v3).
       * Keep the previous behavior below instead of failing, but `zod-to-json-schema` can't read v4 schemas.
       */
      if (!this.warnedAboutLegacyZodV4) {
        this.warnedAboutLegacyZodV4 = true;
        console.warn(
          '[@novu/framework] Could not convert a Zod v4 schema to JSON Schema, so it will be empty in Novu. Upgrade `zod` to 4.6.6 or later and import from `zod`.'
        );
      }
    }

    await checkDependencies(this.zodV3JsonSchemaImports, 'Zod v3 schema');
    const { zodToJsonSchema } = await import('zod-to-json-schema');

    // TODO: zod-to-json-schema is not using JSONSchema7
    return zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0]) as JsonSchema;
  }
}
