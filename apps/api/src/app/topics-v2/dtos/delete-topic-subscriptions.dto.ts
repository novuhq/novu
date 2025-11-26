import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TopicSubscriberIdentifierDto } from '../../shared/dtos/subscriptions/create-subscriptions.dto';

@ApiExtraModels(TopicSubscriberIdentifierDto)
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
      'List of subscriptions to unsubscribe from the topic (max: 100). Can be either a string array of subscriber IDs or an array of objects with identifier and subscriberId',
    type: 'array',
    items: {
      oneOf: [{ type: 'string' }, { $ref: getSchemaPath(TopicSubscriberIdentifierDto) }],
    },
    example: [{ identifier: 'subscriber-123-subscription-a' }, { identifier: 'subscriber-456-subscription-b' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Cannot unsubscribe more than 100 subscriptions at once' })
  @ArrayMinSize(1, { message: 'At least one subscription is required' })
  subscriptions?: Array<string | Pick<TopicSubscriberIdentifierDto, 'identifier'>>;
}
