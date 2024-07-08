import Ajv, { type ErrorObject, type ValidateFunction as AjvValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidateResult, Validator } from '../types/validator.types';
import type { JsonSchema, Schema } from '../types/schema.types';

export class JsonSchemaValidator implements Validator<JsonSchema> {
  private readonly ajv: Ajv;
  private readonly compiledSchemas: Map<JsonSchema, AjvValidateFunction>;

  constructor() {
    this.ajv = new Ajv({
      // https://ajv.js.org/options.html#usedefaults
      useDefaults: true,
      // https://ajv.js.org/options.html#removeadditional
      removeAdditional: 'all',
    });
    addFormats(this.ajv);
    this.compiledSchemas = new Map();
  }

  isSchema(schema: Schema): schema is JsonSchema {
    if (typeof schema === 'boolean') return false;

    return (
      (schema as Exclude<JsonSchema, boolean>).type === 'object' ||
      !!(schema as Exclude<JsonSchema, boolean>).anyOf ||
      !!(schema as Exclude<JsonSchema, boolean>).oneOf
    );
  }

  async validate<T>(data: T, schema: JsonSchema): Promise<ValidateResult<T>> {
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

  transformToJsonSchema(schema: JsonSchema): JsonSchema {
    return schema;
  }
}
