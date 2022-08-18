import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ButtonTypeEnum, ChannelCTATypeEnum, ChannelTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { SubscriberResponseDto } from '../../subscribers/dtos';
import { NotificationTemplateResponse } from '../../notification-template/dto/notification-template-response.dto';

class EmailBlockStyles {
  @ApiProperty({
    enum: ['left', 'right', 'center'],
  })
  textAlign?: 'left' | 'right' | 'center';
}

class EmailBlock {
  @ApiProperty({
    enum: ['text', 'button'],
  })
  type: 'text' | 'button';
  @ApiProperty()
  content: string;
  @ApiPropertyOptional()
  url?: string;
  @ApiPropertyOptional({
    type: EmailBlockStyles,
  })
  styles?: EmailBlockStyles;
}

class MessageActionResult {
  @ApiPropertyOptional()
  payload?: Record<string, unknown>;
  @ApiPropertyOptional({
    enum: ButtonTypeEnum,
  })
  type?: ButtonTypeEnum;
}

class MessageButton {
  @ApiProperty({
    enum: ButtonTypeEnum,
  })
  type: ButtonTypeEnum;
  @ApiProperty()
  content: string;
  @ApiPropertyOptional()
  resultContent?: string;
}

class MessageAction {
  @ApiPropertyOptional({
    enum: MessageActionStatusEnum,
  })
  status?: MessageActionStatusEnum;
  @ApiPropertyOptional({
    type: MessageButton,
  })
  buttons?: MessageButton[];
  @ApiProperty({
    type: MessageActionResult,
  })
  result: MessageActionResult;
}

class MessageCTAData {
  @ApiPropertyOptional()
  url?: string;
}

class MessageCTA {
  @ApiProperty()
  type: ChannelCTATypeEnum;
  @ApiProperty()
  data: MessageCTAData;
  @ApiPropertyOptional()
  action?: MessageAction;
}

@ApiExtraModels(EmailBlock, MessageCTA)
export class MessageResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _templateId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _messageTemplateId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _notificationId: string;

  @ApiProperty()
  _subscriberId: string;

  @ApiPropertyOptional({
    type: SubscriberResponseDto,
  })
  subscriber?: SubscriberResponseDto;

  @ApiPropertyOptional({
    type: NotificationTemplateResponse,
  })
  template?: NotificationTemplateResponse;

  @ApiPropertyOptional()
  templateIdentifier?: string;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiProperty({
    oneOf: [
      {
        type: '[EmailBlock]',
      },
      {
        type: 'string',
      },
    ],
  })
  content: string | EmailBlock[];

  @ApiProperty()
  transactionId: string;

  subject?: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum;

  @ApiProperty()
  seen: boolean;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  directWebhookUrl?: string;

  @ApiPropertyOptional()
  providerId?: string;

  @ApiPropertyOptional()
  notificationIdentifiers?: string[];

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  lastSeenDate: string;

  @ApiProperty({
    type: MessageCTA,
  })
  cta: MessageCTA;

  @ApiProperty()
  _feedId: string;

  @ApiProperty({
    enum: ['sent', 'error', 'warning'],
  })
  status: 'sent' | 'error' | 'warning';

  @ApiProperty()
  errorId: string;

  @ApiProperty()
  errorText: string;

  @ApiProperty({
    description: 'Oayload with data to be used inside of message templates',
    example: {
      name: 'Novu',
    },
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'Overrides for push notification settings',
    example: {
      fcm: {
        color: '#fff',
      },
    },
  })
  overrides: Record<string, unknown>;
}
