import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  TopicKey,
  TriggerRecipientSubscriber,
  TriggerRecipients,
  TriggerRecipientsTypeEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { CreateSubscriberRequestDto } from '../../subscribers/dtos';
import { UpdateTenantRequestDto } from '../../tenant/dtos';

export class SubscriberPayloadDto extends CreateSubscriberRequestDto {}
export class TenantPayloadDto extends UpdateTenantRequestDto {}

export class TopicPayloadDto {
  @ApiProperty()
  topicKey: TopicKey;

  @ApiProperty({ example: 'Topic', enum: TriggerRecipientsTypeEnum })
  type: TriggerRecipientsTypeEnum;
}

@ApiExtraModels(SubscriberPayloadDto)
@ApiExtraModels(TenantPayloadDto)
@ApiExtraModels(TopicPayloadDto)
export class TriggerEventRequestDto {
  @ApiProperty({
    description:
      'The trigger identifier of the workflow you wish to send. This identifier can be found on the workflow page.',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description:
      // eslint-disable-next-line max-len
      `The payload object is used to pass additional custom information that could be used to render the workflow, or perform routing rules based on it. 
      This data will also be available when fetching the notifications feed from the API to display certain parts of the UI.`,
    example: {
      comment_id: 'string',
      post: {
        text: 'string',
      },
    },
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

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
    type: [String, SubscriberPayloadDto, TopicPayloadDto],
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
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  @Type(() => SubscriberPayloadDto)
  actor?: TriggerRecipientSubscriber;

  @ApiProperty({
    description: `It is used to specify a tenant context during trigger event.
    If a new tenant object is provided, we will create a new tenant.
    `,
    oneOf: [
      { type: 'string', description: 'Unique identifier of a tenant in your system' },
      { $ref: getSchemaPath(TenantPayloadDto) },
    ],
  })
  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  @Type(() => TenantPayloadDto)
  tenant?: TriggerTenantContext;
}

export class BulkTriggerEventDto {
  @ApiProperty({
    isArray: true,
    type: TriggerEventRequestDto,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  events: TriggerEventRequestDto[];
}
