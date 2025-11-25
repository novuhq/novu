import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  GroupPreferenceFilterDto,
  WorkflowPreferenceRequestDto,
} from '../../shared/dtos/subscriptions/create-subscriptions.dto';

@ApiExtraModels(WorkflowPreferenceRequestDto, GroupPreferenceFilterDto)
export class UpdateTopicSubscriptionRequestDto {
  @ApiProperty({
    description: 'The name of the subscription',
    example: 'My Subscription',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description:
      'The preferences of the topic. Can be a simple workflow ID string, workflow preference object, or group filter object',
    type: 'array',
    items: {
      oneOf: [
        { type: 'string' },
        { $ref: getSchemaPath(WorkflowPreferenceRequestDto) },
        { $ref: getSchemaPath(GroupPreferenceFilterDto) },
      ],
    },
    example: [{ workflowId: 'workflow-123', condition: { '===': [{ var: 'tier' }, 'premium'] } }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  preferences?: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>;
}
