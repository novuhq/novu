import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { GroupPreferenceFilterDto, WorkflowPreferenceRequestDto } from './create-subscriptions.dto';

@ApiExtraModels(WorkflowPreferenceRequestDto, GroupPreferenceFilterDto)
export class UpdateSubscriptionRequestDto {
  @ApiProperty({
    description: 'The name of the subscription',
    example: 'My Subscription',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description:
      'The preferences of the subscription. Can be a simple workflow ID string, workflow preference object, or group filter object',
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
  @IsOptional()
  preferences?: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>;
}
