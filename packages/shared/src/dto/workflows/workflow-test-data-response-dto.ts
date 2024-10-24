import { IsDefined, IsObject } from 'class-validator';
import { JSONSchema } from 'json-schema-to-ts';

export class WorkflowTestDataResponseDto {
  @IsObject()
  @IsDefined()
  to: JSONSchema;

  @IsObject()
  @IsDefined()
  payload: JSONSchema;
}
