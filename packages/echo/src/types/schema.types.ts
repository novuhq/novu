import { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
import Ajv, { ErrorObject, ValidateFunction as AjvValidateFunction } from 'ajv';
import { ZodSchema, infer as ZodInfer, ParseReturnType } from 'zod';
import addFormats from 'ajv-formats';

// export type Schema = JSONSchema;

// export type FromSchema<T extends Schema> = T;

export type Schema = JSONSchema | ZodSchema;

export type FromSchema<T extends Schema> = T extends JSONSchema
  ? JsonSchemaInfer<T>
  : T extends ZodSchema
  ? ZodInfer<T>
  : never;

export type ValidateFunction<T = unknown> = AjvValidateFunction<T> | ((inputs: T) => ParseReturnType<T>);

export type ValidationError = {
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

// TYPE GUARDS
export const isZodSchema = (schema: Schema): schema is ZodSchema => {
  return (schema as ZodSchema).safeParseAsync !== undefined;
};

export const isJsonSchema = (schema: Schema): schema is JSONSchema => {
  if (typeof schema === 'boolean') return false;

  return (schema as Exclude<JSONSchema, boolean>).type === 'object';
};

// VALIDATORS
const ajv = new Ajv({ useDefaults: true });
addFormats(ajv);

export const validateData = async <T>(schema: Schema, data: T): Promise<ValidateResult<T>> => {
  if (isZodSchema(schema)) {
    const result = await schema.safeParseAsync(data);
    if (result.success === true) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.errors.map((err) => ({ message: err.message })),
      };
    }
  }

  if (isJsonSchema(schema)) {
    const result = ajv.validate(schema, data);
    if (result) {
      return { success: true, data: data as T };
    } else {
      return {
        success: false,
        errors: (ajv.errors as ErrorObject<string, Record<string, unknown>, unknown>[]).map((err) => ({
          message: err.message as string,
        })),
      };
    }
  }

  throw new Error('Invalid schema');
};
