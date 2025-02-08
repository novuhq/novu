import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  ButtonTypeEnum,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  EmailBlockTypeEnum,
  IMessage,
  IMessageAction,
  IMessageCTA,
  MessageActionStatusEnum,
  TextAlignEnum,
} from '@novu/shared';
import { SubscriberResponseDto } from '../../subscribers/dtos';
import { WorkflowResponse } from '../../workflows-v1/dto/workflow-response.dto';

class EmailBlockStyles {
  @ApiProperty({
    enum: [...Object.values(TextAlignEnum)],
    enumName: 'TextAlignEnum',
    description: 'Text alignment for the email block',
  })
  textAlign?: TextAlignEnum;
}

export class EmailBlock {
  @ApiProperty({
    enum: [...Object.values(EmailBlockTypeEnum)],
    enumName: 'EmailBlockTypeEnum',
    description: 'Type of the email block',
  })
  type: EmailBlockTypeEnum;

  @ApiProperty({
    type: String,
    description: 'Content of the email block',
  })
  content: string;

  @ApiPropertyOptional({
    type: String,
    description: 'URL associated with the email block, if any',
  })
  url?: string;

  @ApiPropertyOptional({
    type: EmailBlockStyles,
    description: 'Styles applied to the email block',
  })
  styles?: EmailBlockStyles;
}

class MessageActionResult {
  @ApiPropertyOptional({
    description: 'Payload of the action result',
    type: Object,
  })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: [...Object.values(ButtonTypeEnum)],
    enumName: 'ButtonTypeEnum',
    description: 'Type of button for the action result',
  })
  type?: ButtonTypeEnum;
}

class MessageButton {
  @ApiProperty({
    enum: [...Object.values(ButtonTypeEnum)],
    enumName: 'ButtonTypeEnum',
    description: 'Type of the button',
  })
  type: ButtonTypeEnum;

  @ApiProperty({
    type: String,
    description: 'Content of the button',
  })
  content: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Content of the result when the button is clicked',
  })
  resultContent?: string;
}

class MessageAction implements IMessageAction {
  @ApiPropertyOptional({
    enum: [...Object.values(MessageActionStatusEnum)],
    enumName: 'MessageActionStatusEnum',
    description: 'Status of the message action',
  })
  status?: MessageActionStatusEnum;

  @ApiPropertyOptional({
    type: MessageButton,
    isArray: true,
    description: 'List of buttons associated with the message action',
  })
  buttons?: MessageButton[];

  @ApiPropertyOptional({
    type: MessageActionResult,
    description: 'Result of the message action',
  })
  result: MessageActionResult;
}

class MessageCTAData {
  @ApiPropertyOptional({
    type: String,
    description: 'URL for the call to action',
  })
  url?: string;
}

export class MessageCTA implements IMessageCTA {
  @ApiPropertyOptional({
    enum: [...Object.values(ChannelCTATypeEnum)],
    enumName: 'ChannelCTATypeEnum',
    description: 'Type of call to action',
  })
  type: ChannelCTATypeEnum;

  @ApiProperty({
    description: 'Data associated with the call to action',
    type: MessageCTAData,
  })
  data: MessageCTAData;

  @ApiPropertyOptional({
    description: 'Action associated with the call to action',
    type: MessageAction,
  })
  action?: MessageAction;
}

@ApiExtraModels(EmailBlock, MessageCTA)
export class MessageResponseDto implements IMessage {
  @ApiPropertyOptional({
    type: String,
    description: 'Unique identifier for the message',
  })
  _id: string;

  @ApiProperty({
    type: String,
    description: 'Template ID associated with the message',
  })
  _templateId: string;

  @ApiProperty({
    type: String,
    description: 'Environment ID where the message is sent',
  })
  _environmentId: string;

  @ApiProperty({
    type: String,
    description: 'Message template ID',
  })
  _messageTemplateId: string;

  @ApiProperty({
    type: String,
    description: 'Organization ID associated with the message',
  })
  _organizationId: string;

  @ApiProperty({
    type: String,
    description: 'Notification ID associated with the message',
  })
  _notificationId: string;

  @ApiProperty({
    type: String,
    description: 'Subscriber ID associated with the message',
  })
  _subscriberId: string;

  @ApiPropertyOptional({
    type: SubscriberResponseDto,
    description: 'Subscriber details, if available',
  })
  subscriber?: SubscriberResponseDto;

  @ApiPropertyOptional({
    type: WorkflowResponse,
    description: 'Workflow template associated with the message',
  })
  template?: WorkflowResponse;

  @ApiPropertyOptional({
    type: String,
    description: 'Identifier for the message template',
  })
  templateIdentifier?: string;

  @ApiProperty({
    type: String,
    description: 'Creation date of the message',
  })
  createdAt: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Last seen date of the message, if available',
  })
  lastSeenDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Last read date of the message, if available',
  })
  lastReadDate?: string;

  @ApiProperty({
    oneOf: [
      {
        $ref: getSchemaPath(EmailBlock),
      },
      {
        type: 'string',
        description: 'String representation of the content',
      },
    ],
    description: 'Content of the message, can be an email block or a string',
  })
  content: string | EmailBlock[];

  @ApiProperty({
    type: String,
    description: 'Transaction ID associated with the message',
  })
  transactionId: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Subject of the message, if applicable',
  })
  subject?: string;

  @ApiProperty({
    enum: [...Object.values(ChannelTypeEnum)],
    enumName: 'ChannelTypeEnum',
    description: 'Channel type through which the message is sent',
  })
  channel: ChannelTypeEnum;

  @ApiProperty({
    type: Boolean,
    description: 'Indicates if the message has been read',
  })
  read: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Indicates if the message has been seen',
  })
  seen: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Email address associated with the message, if applicable',
  })
  email?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Phone number associated with the message, if applicable',
  })
  phone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Direct webhook URL for the message, if applicable',
  })
  directWebhookUrl?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Provider ID associated with the message, if applicable',
  })
  providerId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Device tokens associated with the message, if applicable',
  })
  deviceTokens?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Title of the message, if applicable',
  })
  title?: string;

  @ApiProperty({
    type: MessageCTA,
    description: 'Call to action associated with the message',
  })
  cta: MessageCTA;

  @ApiPropertyOptional({
    type: String,
    description: 'Feed ID associated with the message, if applicable',
  })
  _feedId?: string | null;

  @ApiProperty({
    enum: ['sent', 'error', 'warning'],
    enumName: 'MessageStatusEnum',
    description: 'Status of the message',
  })
  status: 'sent' | 'error' | 'warning';

  @ApiPropertyOptional({
    type: String,
    description: 'Error ID if the message has an error',
  })
  errorId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Error text if the message has an error',
  })
  errorText?: string;

  @ApiPropertyOptional({
    description: 'The payload that was used to send the notification trigger',
    type: Object,
  })
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Provider specific overrides used when triggering the notification',
    type: Object,
  })
  overrides?: Record<string, unknown>;
}

export class MessagesResponseDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'Total number of messages available',
  })
  totalCount?: number;

  @ApiProperty({
    type: Boolean,
    description: 'Indicates if there are more messages available',
  })
  hasMore: boolean;

  @ApiProperty({
    type: [MessageResponseDto],
    description: 'List of messages',
  })
  data: MessageResponseDto[];

  @ApiProperty({
    type: Number,
    description: 'Number of messages per page',
  })
  pageSize: number;

  @ApiProperty({
    type: Number,
    description: 'Current page number',
  })
  page: number;
}
