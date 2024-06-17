import { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
import Ajv, { ErrorObject, ValidateFunction as AjvValidateFunction } from 'ajv';
import { ZodSchema, infer as ZodInfer, ParseReturnType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import addFormats from 'ajv-formats';

// export type Schema = JSONSchema;

// export type FromSchema<T extends Schema> = T;

export type Schema = JSONSchema | ZodSchema;

export type JsonSchema = JSONSchema;

export type FromSchema<T extends Schema> = T extends JSONSchema
  ? JsonSchemaInfer<T>
  : T extends ZodSchema
  ? ZodInfer<T>
  : never;

export type ValidateFunction<T = unknown> = AjvValidateFunction<T> | ((inputs: T) => ParseReturnType<T>);

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
interface Validator<T_Schema extends Schema> {
  validate: <T_Data>(data: T_Data, schema: T_Schema) => Promise<ValidateResult<T_Data>>;
  isSchema: (schema: Schema) => schema is T_Schema;
  transformToJsonSchema: (schema: T_Schema) => JSONSchema;
}

class ZodValidator implements Validator<ZodSchema> {
  async validate<T>(data: T, schema: ZodSchema): Promise<ValidateResult<T>> {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.errors.map((err) => ({
          path: err.path.join(),
          message: err.message,
        })),
      };
    }
  }

  isSchema(schema: Schema): schema is ZodSchema {
    return (schema as ZodSchema).safeParseAsync !== undefined;
  }

  transformToJsonSchema(schema: ZodSchema): JSONSchema {
    // @ts-expect-error - JSONSchema7 is incorrectly typed
    return zodToJsonSchema(schema);
  }
}

class JsonSchemaValidator implements Validator<JSONSchema> {
  private readonly ajv: Ajv;
  private readonly compiledSchemas: Map<JSONSchema, AjvValidateFunction>;

  constructor() {
    this.ajv = new Ajv({ useDefaults: true });
    addFormats(this.ajv);
    this.compiledSchemas = new Map();
  }

  async validate<T>(data: T, schema: JSONSchema): Promise<ValidateResult<T>> {
    let validateFn = this.compiledSchemas.get(schema);

    if (!validateFn) {
      validateFn = this.ajv.compile(schema);
      this.compiledSchemas.set(schema, validateFn);
    }

    const valid = validateFn(data);
    if (valid) {
      return { success: true, data: data as T };
    } else {
      return {
        success: false,
        errors: (validateFn.errors as ErrorObject<string, Record<string, unknown>, unknown>[]).map((err) => ({
          path: err.instancePath,
          message: err.message as string,
        })),
      };
    }
  }

  isSchema(schema: Schema): schema is JSONSchema {
    if (typeof schema === 'boolean') return false;

    return (schema as Exclude<JSONSchema, boolean>).type === 'object';
  }

  transformToJsonSchema(schema: JSONSchema): JSONSchema {
    return schema;
  }
}

const validators = [new ZodValidator(), new JsonSchemaValidator()];
export const validateData = async <T>(schema: Schema, data: T): Promise<ValidateResult<T>> => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      return validator.validate(data, schema as any);
    }
  }

  throw new Error('Invalid schema');
};

export const transformSchema = (schema: Schema): JSONSchema => {
  for (const validator of validators) {
    if (validator.isSchema(schema)) {
      return validator.transformToJsonSchema(schema as any);
    }
  }

  throw new Error('Invalid schema');
};
