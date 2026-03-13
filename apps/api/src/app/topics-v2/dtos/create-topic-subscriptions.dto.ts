import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  GroupPreferenceFilterDto,
  TopicSubscriberIdentifierDto,
  WorkflowPreferenceRequestDto,
} from '../../shared/dtos/subscriptions/create-subscriptions.dto';

@ApiExtraModels(WorkflowPreferenceRequestDto, GroupPreferenceFilterDto, TopicSubscriberIdentifierDto)
export class CreateTopicSubscriptionsRequestDto {
  @ApiProperty({
    description:
      'List of subscriber IDs to subscribe to the topic (max: 100). @deprecated Use the "subscriptions" property instead.',
    type: [String],
    example: ['subscriberId1', 'subscriberId2'],
    deprecated: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Cannot subscribe more than 100 subscribers at once' })
  @ArrayMinSize(1, { message: 'At least one subscriber identifier is required' })
  subscriberIds?: string[];

  @ApiProperty({
    description:
      'List of subscriptions to subscribe to the topic (max: 100). Can be either a string array of subscriber IDs or an array of objects with identifier and subscriberId',
    type: 'array',
    items: {
      oneOf: [{ type: 'string' }, { $ref: getSchemaPath(TopicSubscriberIdentifierDto) }],
    },
    example: [
      { identifier: 'subscriber-123-subscription-a', subscriberId: 'subscriber-123' },
      { identifier: 'subscriber-456-subscription-b', subscriberId: 'subscriber-456' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Cannot subscribe more than 100 subscriptions at once' })
  @ArrayMinSize(1, { message: 'At least one subscription is required' })
  subscriptions?: Array<string | TopicSubscriberIdentifierDto>;

  @ApiProperty({
    description: 'The name of the topic',
    example: 'My Topic',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

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
