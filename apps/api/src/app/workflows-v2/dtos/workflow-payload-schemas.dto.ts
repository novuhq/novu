import { ApiProperty } from '@nestjs/swagger';
import type {
  JSONSchemaDto,
  WorkflowPayloadSchemasResponseDto as WorkflowPayloadSchemasResponseContract,
} from '@novu/shared';
import { IsArray } from 'class-validator';

export class WorkflowPayloadSchemasResponseDto implements WorkflowPayloadSchemasResponseContract {
  @ApiProperty({
    description: 'Payload schemas declared by workflows in the environment',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @IsArray()
  payloadSchemas: JSONSchemaDto[];
}
