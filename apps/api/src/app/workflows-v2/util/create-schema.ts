import { JsonSchemaTypeEnum } from '@novu/dal';
import { JSONSchemaDto } from '../dtos';

function determineSchemaType(value: unknown): JSONSchemaDto {
  if (value === null) {
    return { type: JsonSchemaTypeEnum.NULL };
  }

  if (Array.isArray(value)) {
    return {
      type: JsonSchemaTypeEnum.ARRAY,
      items: value.length > 0 ? determineSchemaType(value[0]) : { type: JsonSchemaTypeEnum.ARRAY },
    };
  }

  switch (typeof value) {
    case 'string':
      return { type: JsonSchemaTypeEnum.STRING, default: value };
    case 'number':
      return { type: JsonSchemaTypeEnum.NUMBER, default: value };
    case 'boolean':
      return { type: JsonSchemaTypeEnum.BOOLEAN, default: value };
    case 'object':
      return {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: Object.entries(value).reduce(
          (acc, [key, val]) => {
            acc[key] = determineSchemaType(val);

            return acc;
          },
          {} as { [key: string]: JSONSchemaDto }
        ),
        required: Object.keys(value),
      };

    default:
      return { type: JsonSchemaTypeEnum.NULL };
  }
}

export function buildVariablesSchema(object: unknown) {
  const schema: JSONSchemaDto = {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {},
    required: [],
    additionalProperties: true,
  };

  if (object) {
    for (const [key, value] of Object.entries(object)) {
      if (schema.properties && schema.required) {
        schema.properties[key] = determineSchemaType(value);
        schema.required.push(key);
      }
    }
  }

  return schema;
}
