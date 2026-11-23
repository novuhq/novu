import type { ValidateFunction as AjvValidateFunction } from 'ajv';
import type { ImportRequirement } from './import.types';
import type { FromSchema, FromSchemaUnvalidated, Schema } from './schema.types';
import type { JsonSchema } from './schema.types/json.schema.types';

/**
 * The result of a Zod `safeParse` call. Declared structurally so it holds for both Zod v3 and v4,
 * whose exported result types differ.
 */
type ZodSafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> } };

export type ValidateFunction<T = unknown> = AjvValidateFunction<T> | ((data: T) => ZodSafeParseResult<T>);

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidateResult<T> =
  | {
      success: false;
      errors: ValidationError[];
    }
  | {
      success: true;
      data: T;
    };

export type Validator<T_Schema extends Schema = Schema> = {
  validate: <
    T_Unvalidated extends Record<string, unknown> = FromSchemaUnvalidated<T_Schema>,
    T_Validated extends Record<string, unknown> = FromSchema<T_Schema>,
  >(
    data: T_Unvalidated,
    schema: T_Schema
  ) => Promise<ValidateResult<T_Validated>>;
  canHandle: (schema: Schema) => Promise<boolean>;
  transformToJsonSchema: (schema: T_Schema) => Promise<JsonSchema>;
  requiredImports: readonly ImportRequirement[];
};
