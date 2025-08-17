import { JsonSchemaFormatEnum, JsonSchemaTypeEnum } from '@novu/dal';
import { SeverityLevelEnum } from '@novu/shared';
import { JSONSchemaDto } from '../dtos/json-schema.dto';

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

export const buildSubscriberSchema = (subscriber: unknown) => {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    description: 'Schema representing the subscriber entity',
    properties: {
      firstName: { type: JsonSchemaTypeEnum.STRING, description: "Subscriber's first name" },
      lastName: { type: JsonSchemaTypeEnum.STRING, description: "Subscriber's last name" },
      email: { type: JsonSchemaTypeEnum.STRING, description: "Subscriber's email address" },
      phone: { type: JsonSchemaTypeEnum.STRING, description: "Subscriber's phone number (optional)" },
      avatar: { type: JsonSchemaTypeEnum.STRING, description: "URL to the subscriber's avatar image (optional)" },
      locale: { type: JsonSchemaTypeEnum.STRING, description: 'Locale for the subscriber (optional)' },
      timezone: { type: JsonSchemaTypeEnum.STRING, description: 'Timezone for the subscriber (optional)' },
      subscriberId: { type: JsonSchemaTypeEnum.STRING, description: 'Unique identifier for the subscriber' },
      isOnline: {
        type: JsonSchemaTypeEnum.BOOLEAN,
        description: 'Indicates if the subscriber is online (optional)',
      },
      lastOnlineAt: {
        type: JsonSchemaTypeEnum.STRING,
        format: JsonSchemaFormatEnum.DATETIME,
        description: 'The last time the subscriber was online (optional)',
      },
      data: buildVariablesSchema(
        subscriber && typeof subscriber === 'object' && 'data' in subscriber ? subscriber.data : {}
      ),
    },
    required: ['firstName', 'lastName', 'email', 'subscriberId'],
    additionalProperties: false,
  };
};

export const buildWorkflowSchema = () => {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    description: 'Schema representing the workflow entity',
    properties: {
      workflowId: { type: JsonSchemaTypeEnum.STRING, description: 'Workflow identifier' },
      name: { type: JsonSchemaTypeEnum.STRING, description: 'Name of the workflow' },
      description: { type: JsonSchemaTypeEnum.STRING, description: 'Description of the workflow' },
      tags: { type: JsonSchemaTypeEnum.ARRAY, items: { type: JsonSchemaTypeEnum.STRING } },
      severity: {
        type: JsonSchemaTypeEnum.STRING,
        enum: [...Object.values(SeverityLevelEnum)],
        enumName: 'SeverityLevelEnum',
        description: 'Severity of the workflow',
      },
    },
    required: ['workflowId', 'name'],
  };
};
