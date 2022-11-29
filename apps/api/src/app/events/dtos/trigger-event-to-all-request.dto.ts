import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { TriggerRecipientsTypeSingle } from '@novu/node';
import { SubscriberPayloadDto } from './trigger-event-request.dto';

export class TriggerEventToAllRequestDto {
  @ApiProperty({
    description:
      'The trigger identifier associated for the template you wish to send. This identifier can be found on the template page.',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description: `The payload object is used to pass additional custom information that could be used to render the template, or perform routing rules based on it. 
      This data will also be available when fetching the notifications feed from the API to display certain parts of the UI.`,
    example: {
      comment_id: 'string',
      post: {
        text: 'string',
      },
    },
  })
  @IsObject()
  payload: Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any

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
