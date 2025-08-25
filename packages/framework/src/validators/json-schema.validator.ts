import type { ValidateFunction as AjvValidateFunction, ErrorObject } from 'ajv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ImportRequirement } from '../types/import.types';
import type { FromSchema, FromSchemaUnvalidated, JsonSchema, Schema } from '../types/schema.types';
import type { ValidateResult, Validator } from '../types/validator.types';
import { cloneData } from '../utils/clone.utils';
import { checkDependencies } from '../utils/import.utils';

export class JsonSchemaValidator implements Validator<JsonSchema> {
  /**
   * Json schema validation has no required dependencies as they are included in
   * the `@novu/framework` package dependencies.
   */
  readonly requiredImports: readonly ImportRequirement[] = [];

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
    let validateFn = this.compiledSchemas.get(schema);

    if (!validateFn) {
      validateFn = this.ajv.compile(schema);
      this.compiledSchemas.set(schema, validateFn);
    }
    // ajv mutates the data, so we need to clone it to avoid side effects
    const clonedData = cloneData(data);

    const valid = validateFn(clonedData);

    if (valid) {
      return { success: true, data: clonedData as unknown as T_Validated };
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

  async transformToJsonSchema(schema: JsonSchema): Promise<JsonSchema> {
    return schema;
  }
}
