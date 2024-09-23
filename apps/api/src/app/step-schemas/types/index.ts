import { actionStepSchemas, channelStepSchemas, Schema } from '@novu/framework';

export const schemasList = Object.values({ ...channelStepSchemas, ...actionStepSchemas }).map(
  (schema) => schema.output
);

export const customActionStepSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export type SchemaOutput = (typeof schemasList)[number] | typeof customActionStepSchema;
