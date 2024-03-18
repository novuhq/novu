import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  ButtonTypeEnum,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  EmailBlockTypeEnum,
  MessageActionStatusEnum,
  TextAlignEnum,
} from '@novu/shared';
import { SubscriberResponseDto } from '../../subscribers/dtos';
import { WorkflowResponse } from '../../workflows/dto/workflow-response.dto';

class EmailBlockStyles {
  @ApiProperty({
    enum: ['left', 'right', 'center'],
  })
  textAlign?: TextAlignEnum;
}

class EmailBlock {
  @ApiProperty({
    enum: ['text', 'button'],
  })
  type: EmailBlockTypeEnum;
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
    isArray: true,
  })
  buttons?: MessageButton[];

  @ApiPropertyOptional({
    type: MessageActionResult,
  })
  result?: MessageActionResult;
}

class MessageCTAData {
  @ApiPropertyOptional()
  url?: string;
}

class MessageCTA {
  @ApiPropertyOptional()
  type?: ChannelCTATypeEnum;
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
    type: WorkflowResponse,
  })
  template?: WorkflowResponse;

  @ApiPropertyOptional()
  templateIdentifier?: string;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiProperty({
    oneOf: [
      {
        $ref: getSchemaPath(EmailBlock),
      },
      {
        type: 'string',
      },
    ],
  })
  content: string | EmailBlock[];

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
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
  deviceTokens?: string[];

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  lastSeenDate: string;

  @ApiProperty({
    type: MessageCTA,
  })
  cta: MessageCTA;

  @ApiProperty()
  _feedId?: string;

  @ApiProperty({
    enum: ['sent', 'error', 'warning'],
  })
  status: 'sent' | 'error' | 'warning';

  @ApiProperty()
  errorId: string;

  @ApiProperty()
  errorText: string;

  @ApiProperty({
    description: 'The payload that was used to send the notification trigger',
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'Provider specific overrides used when triggering the notification',
  })
  overrides: Record<string, unknown>;
}

export class MessagesResponseDto {
  @ApiPropertyOptional()
  totalCount?: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  data: MessageResponseDto[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
