import { JSONSchema } from 'json-schema-to-ts';

export type StepSchemaDto = {
  controls: JSONSchema;
  variables: JSONSchema;
};
