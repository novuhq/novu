import Ajv, { type ErrorObject, type ValidateFunction as AjvValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidateResult, Validator } from '../types/validator.types';
import type { JsonSchema, Schema } from '../types/schema.types';
import { cloneData } from '../utils/clone.utils';

export class JsonSchemaValidator implements Validator<JsonSchema> {
  private readonly ajv: Ajv;

  /**
   * Cache of compiled schemas.
   *
   * Schema compilation into ajv validator is costly, so we cache the compiled schemas
   * to avoid recompiling the same schema multiple times.
   */
  private readonly compiledSchemas: Map<JsonSchema, AjvValidateFunction>;

  constructor() {
    this.ajv = new Ajv({
      // https://ajv.js.org/options.html#usedefaults
      useDefaults: true,
      // https://ajv.js.org/options.html#removeadditional
      removeAdditional: 'failing',
    });
    addFormats(this.ajv);
    this.compiledSchemas = new Map();
  }

  isSchema(schema: Schema): schema is JsonSchema {
    if (typeof schema === 'boolean') return false;

    return (
      (schema as Exclude<JsonSchema, boolean>).type === 'object' ||
      !!(schema as Exclude<JsonSchema, boolean>).anyOf ||
      !!(schema as Exclude<JsonSchema, boolean>).allOf ||
      !!(schema as Exclude<JsonSchema, boolean>).oneOf
    );
  }

  async validate<T extends Record<string, unknown>>(data: T, schema: JsonSchema): Promise<ValidateResult<T>> {
    let validateFn = this.compiledSchemas.get(schema);

    if (!validateFn) {
      validateFn = this.ajv.compile(schema);
      this.compiledSchemas.set(schema, validateFn);
    }
    // ajv mutates the data, so we need to clone it to avoid side effects
    const clonedData = cloneData(data);

    // const valid = validateFn(data);
    const valid = validateFn(clonedData);

    if (valid) {
      return { success: true, data: clonedData };
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
