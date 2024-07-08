import type { ValidateFunction as AjvValidateFunction } from 'ajv';
import type { ParseReturnType } from 'zod';
import type { Schema, JsonSchema } from './schema.types';

export type ValidateFunction<T = unknown> = AjvValidateFunction<T> | ((data: T) => ParseReturnType<T>);

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

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Validator<T_Schema extends Schema> {
  validate: <T_Data>(data: T_Data, schema: T_Schema) => Promise<ValidateResult<T_Data>>;
  isSchema: (schema: Schema) => schema is T_Schema;
  transformToJsonSchema: (schema: T_Schema) => JsonSchema;
}
