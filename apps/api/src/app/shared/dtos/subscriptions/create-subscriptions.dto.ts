import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RulesLogic } from 'json-logic-js';

export class TopicSubscriberIdentifierDto {
  @ApiProperty({
    description: 'Unique identifier for this subscription',
    example: 'subscriber-123-subscription-a',
  })
  @IsString()
  @IsDefined()
  identifier: string;

  @ApiProperty({
    description: 'The subscriber ID',
    example: 'subscriber-123',
  })
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ApiPropertyOptional({
    description: 'The name of the subscription',
    example: 'My Subscription',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class BasePreferenceDto {
  @ApiProperty({
    description: 'Whether the preference is enabled. Used when condition is not provided.',
    required: false,
    type: Boolean,
    example: true,
  })
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    description: 'Optional condition using JSON Logic rules',
    required: false,
    type: 'object',
    additionalProperties: true,
    example: { and: [{ '===': [{ var: 'tier' }, 'premium'] }] },
  })
  @ValidateIf((o) => o.condition !== undefined)
  @IsOptional()
  condition?: RulesLogic;
}

export class WorkflowPreferenceRequestDto extends BasePreferenceDto {
  @ApiProperty({
    description: 'The workflow identifier',
    example: 'workflow-123',
  })
  @IsString()
  @IsDefined()
  workflowId: string;
}

export class GroupPreferenceFilterDetailsDto {
  @ApiProperty({
    description: 'List of workflow identifiers',
    type: [String],
    example: ['workflow-1', 'workflow-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workflowIds?: string[];

  @ApiProperty({
    description: 'List of tags',
    type: [String],
    example: ['tag1', 'tag2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class GroupPreferenceFilterDto extends BasePreferenceDto {
  @ApiProperty({
    description: 'Filter criteria for workflow IDs and tags',
    type: GroupPreferenceFilterDetailsDto,
  })
  @ValidateNested()
  @Type(() => GroupPreferenceFilterDetailsDto)
  @IsDefined()
  filter: GroupPreferenceFilterDetailsDto;
}

@ApiExtraModels(WorkflowPreferenceRequestDto, GroupPreferenceFilterDto, TopicSubscriberIdentifierDto)
export class CreateSubscriptionsRequestDto {
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
  @IsOptional()
  preferences?: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>;
}
