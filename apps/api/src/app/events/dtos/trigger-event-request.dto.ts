import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { TriggerRecipientsType, TriggerRecipientsTypeSingle } from '@novu/node';

export class SubscriberPayloadDto {
  @ApiProperty()
  firstName?: string;
  @ApiProperty()
  lastName?: string;
  @ApiProperty()
  email?: string;
  @ApiProperty()
  phone?: string;
  @ApiProperty()
  avatar?: string;
}

@ApiExtraModels(SubscriberPayloadDto)
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
        color: '#fff',
      },
    },
  })
  @IsObject()
  @IsOptional()
  overrides?: Record<string, Record<string, unknown>>;

  @ApiProperty({
    description: 'The recipients list of people who will receive the notification',
    oneOf: [
      {
        $ref: getSchemaPath(SubscriberPayloadDto),
      },
      {
        type: '[SubscriberPayloadDto]',
        description: 'List of subscriber objects',
      },
      { type: 'string', description: 'Unique identifier of a subscriber in your systems' },
      {
        type: '[string]',
        description: 'List of subscriber identifiers',
      },
    ],
  })
  @IsDefined()
  to: TriggerRecipientsType;

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
  actor?: TriggerRecipientsTypeSingle;
}
