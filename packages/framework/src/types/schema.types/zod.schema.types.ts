import type zod from 'zod';

/**
 * A ZodSchema used to validate a JSON object.
 */
export type ZodSchema = zod.ZodType<Record<string, unknown>, zod.ZodTypeDef, Record<string, unknown>>;

/**
 * A minimal ZodSchema type.
 *
 * It is necessary to define a minimal ZodSchema type to enable correct inference
 * when Zod is not available, as Typescript doesn't support detection of module
 * availability via `typeof import('zod')`.
 */
export type ZodSchemaMinimal = {
  readonly safeParseAsync: unknown;
};

/**
 * Infer the data type of a ZodSchema.
 *
 * @param T - The ZodSchema to infer the data type of.
 * @param Options - Configuration options for the type inference. The `validated` flag determines whether the schema has been validated. If `validated` is true, all properties are required unless specified otherwise. If false, properties with default values are optional.
 *
 * @example
 * ```ts
 * const mySchema = z.object({
 *   name: z.string(),
 *   email: z.string().optional(),
 * });
 *
 * // has type { name: string, email?: string }
 * type MySchema = InferZodSchema<typeof mySchema>;
 * ```
 */
export type InferZodSchema<T, Options extends { validated: boolean }> = T extends ZodSchemaMinimal // Firstly, narrow to the minimal schema type without using the `zod` import
  ? // Secondly, use structural checks on `_output`/`_input` — Zod's public phantom type
    // properties — rather than a nominal `T extends ZodSchema` class check.
    // This ensures inference works correctly even when the user's `zod` module instance
    // differs from the framework's (e.g. different node_modules paths in a monorepo).
    T extends {
      readonly _output: infer Output extends Record<string, unknown>;
      readonly _input: infer Input extends Record<string, unknown>;
    }
    ? Options['validated'] extends true
      ? Output
      : Input
    : never
  : never;
