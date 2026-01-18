import { JSONSchemaDefinition, JSONSchemaDto, UiSchema } from '@novu/shared';
import * as z from 'zod';
import { capitalize } from './string';

export type ZodValue =
  | z.ZodObject
  | z.ZodString
  | z.ZodNumber
  | z.ZodNullable<z.ZodType>
  | z.ZodDefault<z.ZodType>
  | z.ZodEnum
  | z.ZodOptional<z.ZodType>
  | z.ZodBoolean
  | z.ZodAny
  | z.ZodUnion
  | z.ZodType;

const handleStringFormat = ({ value, key, format }: { value: z.ZodString; key: string; format: string }) => {
  if (format === 'email') {
    return z.email();
  } else if (format === 'uri') {
    return value
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => !val || z.url().safeParse(val).success, {
        message: `${capitalize(key)} must be a valid URI`,
      });
  }

  return value;
};

const handleStringPattern = ({ value, key, pattern }: { value: z.ZodString; key: string; pattern: string }) => {
  return value
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => !val || z.string().regex(new RegExp(pattern)).safeParse(val).success, {
      message: `${capitalize(key)} must be a valid value`,
    });
};

const handleStringType = ({
  key,
  requiredFields,
  jsonSchema,
}: {
  key: string;
  requiredFields: Readonly<Array<string>>;
  jsonSchema: JSONSchemaDto;
}) => {
  const { format, pattern, enum: enumValues, default: defaultValue, minLength } = jsonSchema;
  const isRequired = requiredFields.includes(key);

  let stringValue: z.ZodType = z.string();

  if (format) {
    stringValue = handleStringFormat({
      value: stringValue as z.ZodString,
      key,
      format,
    }) as z.ZodType;
  } else if (pattern) {
    stringValue = handleStringPattern({
      value: stringValue as z.ZodString,
      key,
      pattern,
    }) as z.ZodType;
  } else if (enumValues) {
    stringValue = z.enum(enumValues as [string, ...string[]]);
  } else if (isRequired || minLength) {
    stringValue = (stringValue as z.ZodString).min(minLength ?? 1);
  }

  if (defaultValue) {
    stringValue = stringValue.default(defaultValue as string);
  }

  return stringValue;
};

const handleNumberType = ({ jsonSchema }: { jsonSchema: JSONSchemaDto }) => {
  const { default: defaultValue, minimum, maximum } = jsonSchema;
  let numberValue: z.ZodNumber | z.ZodDefault<z.ZodNumber> = z.number();

  if (typeof minimum === 'number') {
    numberValue = numberValue.min(minimum);
  }

  if (typeof maximum === 'number') {
    numberValue = numberValue.max(maximum);
  }

  if (defaultValue !== undefined) {
    numberValue = numberValue.default(defaultValue as number);
  }

  return numberValue;
};

const getZodValueByType = (jsonSchema: JSONSchemaDefinition, key: string): ZodValue => {
  if (typeof jsonSchema !== 'object') {
    return z.any();
  }

  const requiredFields = jsonSchema.required ?? [];
  const { type, default: defaultValue, required } = jsonSchema;

  if (type === 'object') {
    let zodValue = buildDynamicZodSchema(jsonSchema, key) as z.ZodType;

    if (defaultValue) {
      zodValue = zodValue.default(defaultValue as object);
    }

    zodValue = zodValue.transform((val) => {
      const valAsRecord = val as Record<string, unknown>;
      const hasAnyRequiredEmpty = required?.some(
        (field) => valAsRecord[field] === '' || valAsRecord[field] === undefined
      );

      return hasAnyRequiredEmpty ? undefined : val;
    });
    return zodValue.nullable();
  } else if (type === 'string') {
    return handleStringType({ key, requiredFields, jsonSchema });
  } else if (type === 'boolean') {
    return z.boolean();
  } else if (type === 'number') {
    return handleNumberType({ jsonSchema });
  } else if (typeof jsonSchema === 'object' && jsonSchema.anyOf) {
    const anyOf = jsonSchema.anyOf.map((oneOfObj) => buildDynamicZodSchema(oneOfObj, key));

    return z.union(anyOf as any);
  } else {
    return z.any();
  }
};

/**
 * Transform JSONSchema to Zod schema.
 * The function will recursively build the schema based on the JSONSchema object.
 * It removes empty strings and objects with empty required fields during the transformation phase after parsing.
 */
export const buildDynamicZodSchema = (obj: JSONSchemaDefinition, key = ''): ZodValue => {
  if (typeof obj === 'object' && obj.type === 'object') {
    const properties = obj.properties ?? {};
    const requiredFields = obj.required ?? [];

    const keys: Record<string, z.ZodType> = Object.keys(properties).reduce((acc, key) => {
      const jsonSchemaProp = properties[key];

      if (typeof jsonSchemaProp !== 'object') {
        return acc;
      }

      let zodValue = getZodValueByType(jsonSchemaProp, key);

      const isRequired = requiredFields.includes(key);

      if (!isRequired) {
        zodValue = zodValue.optional() as ZodValue;
      }

      return { ...acc, [key]: zodValue };
    }, {});

    return z.object({ ...keys });
  } else {
    // handle different JSONSchema types
    return getZodValueByType(obj, key);
  }
};

/**
 * Build default values based on the UI Schema object.
 */
export const buildDefaultValues = (uiSchema: UiSchema): Record<string, unknown> => {
  const properties = typeof uiSchema === 'object' ? (uiSchema.properties ?? {}) : {};

  const keys: Record<string, unknown> = Object.keys(properties).reduce((acc, key) => {
    const property = properties[key];

    if (typeof property !== 'object') {
      return acc;
    }

    const { placeholder: defaultValue } = property;

    if (typeof defaultValue === 'undefined') {
      return acc;
    }

    if (defaultValue === null) {
      return { ...acc, [key]: defaultValue };
    }

    if (typeof defaultValue === 'object') {
      return { ...acc, [key]: buildDefaultValues({ properties: { ...defaultValue } }) };
    }

    return { ...acc, [key]: defaultValue };
  }, {});

  return keys;
};

const getProperties = (defaults: Record<string, unknown>, properties?: Record<string, JSONSchemaDefinition>): void => {
  if (!properties) return;

  for (const [key, propDef] of Object.entries(properties)) {
    const prop = propDef as JSONSchemaDto; // Narrowing to JSONSchemaDto for easier access to properties

    // Handle `default` value if specified
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
      continue;
    }

    // Handle `type` to determine defaults
    if (prop.type === 'object' && prop.properties) {
      const nestedDefaults: Record<string, unknown> = {};
      getProperties(nestedDefaults, prop.properties);
      defaults[key] = nestedDefaults;
      continue;
    }

    if (prop.type === 'array' && prop.items) {
      const arrayDefaults: unknown[] = [];

      if (Array.isArray(prop.items)) {
        arrayDefaults.push(...prop.items.map(() => ({})));
      } else if (typeof prop.items === 'object' && (prop.items as JSONSchemaDto).type === 'object') {
        const itemDefaults: Record<string, unknown> = {};
        getProperties(itemDefaults, (prop.items as JSONSchemaDto).properties);
        arrayDefaults.push(itemDefaults);
      }

      defaults[key] = arrayDefaults;
      continue;
    }

    switch (prop.type) {
      case 'string':
        defaults[key] = '';
        break;
      case 'number':
      case 'integer':
        defaults[key] = undefined;
        break;
      case 'boolean':
        defaults[key] = false;
        break;
      case 'null':
        defaults[key] = null;
        break;
      default:
        defaults[key] = undefined; // Fallback for unknown or unsupported types
    }
  }
};

export const buildDefaultValuesOfDataSchema = (schema: JSONSchemaDto): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  getProperties(result, schema.properties);
  return result;
};
