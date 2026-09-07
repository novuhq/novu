import type { JSONSchemaDto } from './json-schema-dto';

export type WorkflowTestDataResponseDto = {
  to: JSONSchemaDto;
  payload: JSONSchemaDto;
};
