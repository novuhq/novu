import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  GroupPreferenceFilterDto,
  WorkflowPreferenceRequestDto,
} from '../../shared/dtos/subscriptions/create-subscriptions.dto';

export class TopicIdentifierDto {
  @ApiPropertyOptional({
    description: 'The name of the topic',
    example: 'My Topic',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

@ApiExtraModels(WorkflowPreferenceRequestDto, GroupPreferenceFilterDto, TopicIdentifierDto)
export class CreateTopicSubscriptionRequestDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for this subscription. If not provided, a default identifier will be generated.',
    example: 'subscriber-123-subscription-a',
  })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'The name of the subscription',
    example: 'My Subscription',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The topic details',
    type: TopicIdentifierDto,
  })
  @ValidateNested()
  @Type(() => TopicIdentifierDto)
  @IsOptional()
  topic?: TopicIdentifierDto;

  @ApiPropertyOptional({
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
  @IsOptional()
  preferences?: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>;
}
