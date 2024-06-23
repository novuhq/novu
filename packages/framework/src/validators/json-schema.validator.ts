import { JSONSchema } from 'json-schema-to-ts';
import Ajv, { ErrorObject, ValidateFunction as AjvValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ValidateResult, Validator } from '../types/validator.types';
import { Schema } from '../types/schema.types';

export class JsonSchemaValidator implements Validator<JSONSchema> {
  private readonly ajv: Ajv;
  private readonly compiledSchemas: Map<JSONSchema, AjvValidateFunction>;

  constructor() {
    this.ajv = new Ajv({ useDefaults: true });
    addFormats(this.ajv);
    this.compiledSchemas = new Map();
  }

  isSchema(schema: Schema): schema is JSONSchema {
    if (typeof schema === 'boolean') return false;

    return (schema as Exclude<JSONSchema, boolean>).type === 'object';
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

  transformToJsonSchema(schema: JSONSchema): JSONSchema {
    return schema;
  }
}
