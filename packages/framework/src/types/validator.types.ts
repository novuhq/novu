import type { ValidateFunction as AjvValidateFunction } from 'ajv';
import type { ParseReturnType } from 'zod';
import type { Schema, JsonSchema, FromSchema, FromSchemaUnvalidated } from './schema.types';

/**
 * A validation function that can validate data against a JSON schema.
 */
export type ValidateFunction<T = unknown> =
  // AJV validator function
  | AjvValidateFunction<T>
  // Zod validator function
  | ((data: T) => ParseReturnType<T>);

/**
 * A validation error describing a single validation failure of a JSON data structure.
 */
export type ValidationError = {
  /**
   * A [JSON-Pointer](https://datatracker.ietf.org/doc/html/rfc6901) to the location of the error in the JSON data.
   */
  path: string;
  /**
   * A human-readable message describing the error for the data at the specified `path`.
   */
  message: string;
};

/**
 * The result of a validation function.
 *
 * - `success: true` if the data is valid against the schema. The `data` is then cast to the type of the schema.
 * - `success: false` if the data is invalid against the schema. The `errors` contain details about the validation failure.
 */
export type ValidateResult<T> =
  | {
      success: false;
      errors: ValidationError[];
    }
  | {
      success: true;
      data: T;
    };

/**
 * A validator that can validate data against a JSON schema.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Validator<T_Schema extends Schema = Schema> {
  validate: <
    T_Unvalidated extends Record<string, unknown> = FromSchemaUnvalidated<T_Schema>,
    T_Validated extends Record<string, unknown> = FromSchema<T_Schema>,
  >(
    data: T_Unvalidated,
    schema: T_Schema
  ) => Promise<ValidateResult<T_Validated>>;
  canHandle: (schema: Schema) => schema is T_Schema;
  transformToJsonSchema: (schema: T_Schema) => JsonSchema;
}
