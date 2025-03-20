import { ValidationError } from 'class-validator';
import type {
  FromSchema,
  FromSchemaUnvalidated,
  Schema,
  JsonSchema,
  ClassValidatorSchema,
} from '../types/schema.types';
import type { ValidateResult, Validator } from '../types/validator.types';
import { checkDependencies } from '../utils/import.utils';
import { ImportRequirement } from '../types/import.types';

// Function to recursively add `additionalProperties: false` to the schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function replaceSchemaRefs(schema: any, schemas: any): JsonSchema {
  if (schema && typeof schema === 'object' && schema?.$ref) {
    // eslint-disable-next-line no-param-reassign
    schema = schemas[schema.$ref.split('/').at(-1)];
  }

  if (schema && typeof schema === 'object')
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        // eslint-disable-next-line no-param-reassign
        schema[key] = replaceSchemaRefs(schema[key], schemas);
      }
    }

  return schema;
}
// Function to recursively add `additionalProperties: false` to the schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addAdditionalPropertiesFalse(schema: any): JsonSchema {
  if (schema && typeof schema === 'object') {
    if (schema.type === 'object') {
      // eslint-disable-next-line no-param-reassign
      schema.additionalProperties = false;
    }

    // If schema has properties, recursively apply the function to each property
    if (schema.properties) {
      for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
          addAdditionalPropertiesFalse(schema.properties[key]);
        }
      }
    }

    // If schema has items (meaning it's an array), apply recursively to each item schema
    if (schema.type === 'array' && schema.items) {
      addAdditionalPropertiesFalse(schema.items);
    }
  }

  return schema;
}
function formatErrors(errors: ValidationError[], parentPath = ''): { path: string; message: string }[] {
  return errors.flatMap((err) => {
    const currentPath = `${parentPath}/${err.property}`.replace(/\/+/g, '/');

    if (err.children && err.children.length > 0) {
      // Recursively format the children
      return formatErrors(err.children, currentPath);
    } else {
      // Base case: no children, return the formatted error
      return {
        path: currentPath,
        message: Object.values(err.constraints || {}).join(', '),
      };
    }
  });
}

export class ClassValidatorValidator implements Validator<ClassValidatorSchema> {
  readonly requiredImports: readonly ImportRequirement[] = [
    {
      name: 'class-validator',
      import: import('class-validator'),
      exports: ['validate', 'getMetadataStorage'],
    },
    {
      name: 'class-transformer',
      import: import('class-transformer'),
      exports: ['plainToInstance', 'instanceToPlain'],
    },
    {
      name: 'class-transformer',
      // @ts-expect-error - class-transformer doesn't export `defaultMetadataStorage` from the root module
      // eslint-disable-next-line import/extensions
      import: import('class-transformer/cjs/storage.js'),
      exports: ['defaultMetadataStorage'],
    },
    {
      name: 'reflect-metadata',
      import: import('reflect-metadata'),
      exports: [],
    },
    {
      name: 'class-validator-jsonschema',
      import: import('class-validator-jsonschema'),
      exports: ['validationMetadatasToSchemas', 'targetConstructorToSchema'],
    },
  ];

  async canHandle(schema: Schema): Promise<boolean> {
    const canHandle =
      typeof (schema as ClassValidatorSchema) === 'function' &&
      (schema as ClassValidatorSchema).prototype !== undefined &&
      (schema as ClassValidatorSchema).prototype.constructor === schema;

    if (canHandle) {
      await checkDependencies(this.requiredImports, 'Class Validator schema');
    }

    return canHandle;
  }

  async validate<
    T_Schema extends ClassValidatorSchema = ClassValidatorSchema,
    T_Unvalidated = FromSchemaUnvalidated<T_Schema>,
    T_Validated = FromSchema<T_Schema>,
  >(data: T_Unvalidated, schema: T_Schema): Promise<ValidateResult<T_Validated>> {
    const { plainToInstance, instanceToPlain } = await import('class-transformer');
    const { validate } = await import('class-validator');

    // Convert plain data to an instance of the schema class
    const instance = plainToInstance(schema, data);

    // Validate the instance
    const errors = await validate(instance as object, { whitelist: true });

    // if undefined, then something went wrong
    if (!instance && !!data) throw new Error('Failed to convert data to an instance of the schema class');

    if (errors.length === 0) {
      return { success: true, data: instanceToPlain(instance) as T_Validated };
    } else {
      return {
        success: false,
        errors: formatErrors(errors),
      };
    }
  }

  async transformToJsonSchema(schema: ClassValidatorSchema): Promise<JsonSchema> {
    /*
     * TODO: replace with direct import, when defaultMetadataStorage is exported by default
     * @see https://github.com/typestack/class-transformer/issues/563#issuecomment-803262394
     */
    // @ts-expect-error - class-transformer doesn't export `defaultMetadataStorage` from the root module
    // eslint-disable-next-line import/extensions
    const { defaultMetadataStorage } = await import('class-transformer/cjs/storage.js');
    const { getMetadataStorage } = await import('class-validator');
    const { validationMetadatasToSchemas, targetConstructorToSchema } = await import('class-validator-jsonschema');

    const schemas = validationMetadatasToSchemas({
      classValidatorMetadataStorage: getMetadataStorage(),
      classTransformerMetadataStorage: defaultMetadataStorage,
    });

    const transformedSchema = addAdditionalPropertiesFalse(
      replaceSchemaRefs(
        targetConstructorToSchema(schema, {
          classValidatorMetadataStorage: getMetadataStorage(),
          classTransformerMetadataStorage: defaultMetadataStorage,
        }),
        schemas
      )
    );

    return transformedSchema;
  }
}
