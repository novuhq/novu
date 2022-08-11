import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { TriggerRecipientsType } from '@novu/node';

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
    description: 'Name of your notification',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description: 'payload with data to be used inside of message templates',
  })
  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiProperty({
    description: 'Overrides for push notification settings',
  })
  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;

  @ApiProperty({
    description: 'Who should we send then notification to',
    oneOf: [
      {
        $ref: getSchemaPath(SubscriberPayloadDto),
      },
      {
        type: '[SubscriberPayloadDto]',
        description: 'List of your users info where you like to send notification to',
      },
      { type: 'string', description: 'Subscriber id of your user' },
      {
        type: '[string]',
        description: 'List of subscriber ids of your users',
      },
    ],
  })
  @IsDefined()
  to: TriggerRecipientsType;

  @ApiProperty({
    description: 'Id to use to keep track of trigger',
  })
  @IsString()
  @IsOptional()
  transactionId: string;
}
