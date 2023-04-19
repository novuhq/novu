import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { TriggerRecipientSubscriber, TriggerRecipients } from '@novu/node';
import { TopicKey, TriggerRecipientsTypeEnum } from '@novu/shared';
import { CreateSubscriberRequestDto } from '../../subscribers/dtos/create-subscriber-request.dto';

export class SubscriberPayloadDto extends CreateSubscriberRequestDto {}

export class TopicPayloadDto {
  @ApiProperty()
  topicKey: TopicKey;

  @ApiProperty({ example: 'Topic', enum: TriggerRecipientsTypeEnum })
  type: TriggerRecipientsTypeEnum;
}

export class BulkTriggerEventDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  events: TriggerEventRequestDto[];
}

@ApiExtraModels(SubscriberPayloadDto)
@ApiExtraModels(TopicPayloadDto)
export class TriggerEventRequestDto {
  @ApiProperty({
    description:
      'The trigger identifier of the template you wish to send. This identifier can be found on the template page.',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description:
      // eslint-disable-next-line max-len
      `The payload object is used to pass additional custom information that could be used to render the template, or perform routing rules based on it. 
      This data will also be available when fetching the notifications feed from the API to display certain parts of the UI.`,
    example: {
      comment_id: 'string',
      post: {
        text: 'string',
      },
    },
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'This could be used to override provider specific configurations',
    example: {
      fcm: {
        data: {
          key: 'value',
        },
      },
    },
  })
  @IsObject()
  @IsOptional()
  overrides?: Record<string, Record<string, unknown>>;

  @ApiProperty({
    description: 'The recipients list of people who will receive the notification.',
    oneOf: [
      {
        $ref: getSchemaPath(SubscriberPayloadDto),
      },
      {
        type: 'string',
        description: 'Unique identifier of a subscriber in your systems',
        example: 'SUBSCRIBER_ID',
      },
      {
        $ref: getSchemaPath(TopicPayloadDto),
      },
    ],
    isArray: true,
  })
  @IsDefined()
  to: TriggerRecipients;

  @ApiProperty({
    description: 'A unique identifier for this transaction, we will generated a UUID if not provided.',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({
    description: `It is used to display the Avatar of the provided actor's subscriber id or actor object.
    If a new actor object is provided, we will create a new subscriber in our system
    `,
    oneOf: [
      { type: 'string', description: 'Unique identifier of a subscriber in your systems' },
      { $ref: getSchemaPath(SubscriberPayloadDto) },
    ],
  })
  @IsOptional()
  actor?: TriggerRecipientSubscriber;
}
