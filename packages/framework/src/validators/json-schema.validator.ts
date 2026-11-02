import type { ValidateFunction as AjvValidateFunction, ErrorObject } from 'ajv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ImportRequirement } from '../types/import.types';
import type { FromSchema, FromSchemaUnvalidated, JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult, Validator } from '../types/validator.types';
import { cloneData } from '../utils/clone.utils';
import { checkDependencies } from '../utils/import.utils';

const MAX_COMPILED_SCHEMAS = 1000;

const createAjv = () => {
  const ajv = new Ajv({
    // https://ajv.js.org/options.html#usedefaults
    useDefaults: true,
    // https://ajv.js.org/options.html#removeadditional
    removeAdditional: 'failing',
    // https://ajv.js.org/options.html#strict
    strict: false,
  });
  addFormats(ajv);

  return ajv;
};

export class JsonSchemaValidator implements Validator<JsonSchema> {
  /**
   * Json schema validation has no required dependencies as they are included in
   * the `@novu/framework` package dependencies.
   */
  readonly requiredImports: readonly ImportRequirement[] = [];

  private ajv = createAjv();

  private readonly compiledSchemas = new Map<string, AjvValidateFunction>();

  async canHandle(schema: Schema): Promise<boolean> {
    const canHandle =
      (schema as JsonSchema).type === 'object' ||
      !!(schema as JsonSchema).anyOf ||
      !!(schema as JsonSchema).allOf ||
      !!(schema as JsonSchema).oneOf;

    if (canHandle) {
      await checkDependencies(this.requiredImports, 'JSON schema');
    }

    return canHandle;
  }

  async validate<
    T_Schema extends JsonSchema = JsonSchema,
    T_Unvalidated = FromSchemaUnvalidated<T_Schema>,
    T_Validated = FromSchema<T_Schema>,
  >(data: T_Unvalidated, schema: T_Schema): Promise<ValidateResult<T_Validated>> {
    const validateFn = this.getValidateFn(schema) as AjvValidateFunction<T_Validated>;
    // ajv mutates the data, so we need to clone it to avoid side effects
    const clonedData = cloneData(data);

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

  private getValidateFn(schema: JsonSchema): AjvValidateFunction {
    const key = JSON.stringify(schema);
    let validateFn = this.compiledSchemas.get(key);

    if (!validateFn) {
      if (this.compiledSchemas.size >= MAX_COMPILED_SCHEMAS) {
        // Ajv retains every compiled schema for the lifetime of its instance, even after
        // `removeSchema`, so replacing the instance is the only way to release them.
        this.ajv = createAjv();
        this.compiledSchemas.clear();
      }
      validateFn = this.ajv.compile(schema);
      this.compiledSchemas.set(key, validateFn);
    }

    return validateFn;
  }

  async transformToJsonSchema(schema: JsonSchema): Promise<JsonSchema> {
    return schema;
  }
}
