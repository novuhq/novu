import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';
import { TopicSubscriberIdentifierDto } from '../../shared/dtos/subscriptions/create-subscriptions.dto';

export class DeleteTopicSubscriberIdentifierDto {
  @ApiProperty({
    description: 'Unique identifier for this subscription. If provided, deletes only this specific subscription.',
    example: 'subscriber-123-subscription-a',
    required: false,
  })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiProperty({
    description:
      'The subscriber ID. If provided without identifier, deletes all subscriptions for this subscriber within the topic.',
    example: 'subscriber-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscriberId?: string;
}

@ApiExtraModels(DeleteTopicSubscriberIdentifierDto, TopicSubscriberIdentifierDto)
export class DeleteTopicSubscriptionsRequestDto {
  @ApiProperty({
    description:
      'List of subscriber identifiers to unsubscribe from the topic (max: 100). @deprecated Use the "subscriptions" property instead.',
    example: ['subscriberId1', 'subscriberId2'],
    type: [String],
    deprecated: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Cannot unsubscribe more than 100 subscribers at once' })
  @ArrayMinSize(1, { message: 'At least one subscriber identifier is required' })
  subscriberIds?: string[];

  @ApiProperty({
    description:
      'List of subscriptions to unsubscribe from the topic (max: 100). Can be either a string array of subscriber IDs or an array of objects with identifier and/or subscriberId. If only subscriberId is provided, all subscriptions for that subscriber within the topic will be deleted.',
    type: 'array',
    items: {
      oneOf: [{ type: 'string' }, { $ref: getSchemaPath(DeleteTopicSubscriberIdentifierDto) }],
    },
    example: [
      { identifier: 'subscriber-123-subscription-a', subscriberId: 'subscriber-123' },
      { subscriberId: 'subscriber-456' },
      { identifier: 'subscriber-789-subscription-b' },
    ],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Cannot unsubscribe more than 100 subscriptions at once' })
  @ArrayMinSize(1, { message: 'At least one subscription is required' })
  subscriptions?: Array<string | DeleteTopicSubscriberIdentifierDto>;
}
