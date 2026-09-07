import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';

export class WrapperDto<T> {
  @ApiProperty({
    description: 'The id of the webhook event',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    description: 'The type of the webhook',
    enum: WebhookEventEnum,
  })
  type: WebhookEventEnum;

  @ApiProperty({
    description: 'The payload of the webhook',
    type: 'object',
  })
  data: T;

  @ApiProperty({
    description: 'The timestamp of the webhook',
    type: 'string',
  })
  timestamp: string;

  @ApiProperty({
    description: 'The environment connected to the webhook',
    type: 'string',
  })
  environmentId: string;

  @ApiProperty({
    description: 'The object of the webhook',
    enum: WebhookObjectTypeEnum,
  })
  object: WebhookObjectTypeEnum;
}
