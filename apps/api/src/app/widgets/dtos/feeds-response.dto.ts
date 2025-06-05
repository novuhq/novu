import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActorTypeEnum, ChannelTypeEnum, IActor, INotificationDto } from '@novu/shared';

import { SubscriberFeedResponseDto } from '../../subscribers/dtos';
import { EmailBlock, MessageCTA } from './message-response.dto';

class ActorFeedItemDto implements IActor {
  @ApiProperty({
    description: 'The data associated with the actor, can be null if not applicable.',
    nullable: true,
    example: null,
    type: String,
  })
  data: string | null;

  @ApiProperty({
    description: 'The type of the actor, indicating the role in the notification process.',
    enum: [...Object.values(ActorTypeEnum)],
    enumName: 'ActorTypeEnum',
    type: ActorTypeEnum,
  })
  type: ActorTypeEnum;
}

@ApiExtraModels(EmailBlock, MessageCTA)
export class NotificationFeedItemDto implements INotificationDto {
  @ApiProperty({
    description: 'Unique identifier for the notification.',
    example: '615c1f2f9b0c5b001f8e4e3b',
    type: String,
  })
  _id: string;

  @ApiProperty({
    description: 'Identifier for the template used to generate the notification.',
    example: 'template_12345',
    type: String,
  })
  _templateId: string;

  @ApiProperty({
    description: 'Identifier for the environment where the notification is sent.',
    example: 'env_67890',
    type: String,
  })
  _environmentId: string;

  @ApiPropertyOptional({
    description: 'Identifier for the message template used.',
    example: 'message_template_54321',
    type: String,
  })
  _messageTemplateId: string;

  @ApiProperty({
    description: 'Identifier for the organization sending the notification.',
    example: 'org_98765',
    type: String,
  })
  _organizationId: string;

  @ApiProperty({
    description: 'Unique identifier for the notification instance.',
    example: 'notification_123456',
    type: String,
  })
  _notificationId: string;

  @ApiProperty({
    description: 'Unique identifier for the subscriber receiving the notification.',
    example: 'subscriber_112233',
    type: String,
  })
  _subscriberId: string;

  @ApiPropertyOptional({
    description: 'Identifier for the feed associated with the notification.',
    example: 'feed_445566',
    type: String,
    nullable: true,
  })
  _feedId?: string | null;

  @ApiProperty({
    description: 'Identifier for the job that triggered the notification.',
    example: 'job_778899',
    type: String,
  })
  _jobId: string;

  @ApiPropertyOptional({
    description: 'Timestamp indicating when the notification was created.',
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2024-12-10T10:10:59.639Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Timestamp indicating when the notification was last updated.',
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2024-12-10T10:10:59.639Z',
  })
  updatedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Actor details related to the notification, if applicable.',
    type: ActorFeedItemDto,
  })
  actor?: ActorFeedItemDto;

  @ApiPropertyOptional({
    description: 'Subscriber details associated with this notification.',
    type: SubscriberFeedResponseDto,
  })
  subscriber?: SubscriberFeedResponseDto;

  @ApiProperty({
    description: 'Unique identifier for the transaction associated with the notification.',
    example: 'transaction_123456',
    type: String,
  })
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Identifier for the template used, if applicable.',
    nullable: true,
    example: 'template_abcdef',
    type: String,
  })
  templateIdentifier?: string | null;

  @ApiPropertyOptional({
    description: 'Identifier for the provider that sends the notification.',
    nullable: true,
    example: 'provider_xyz',
    type: String,
  })
  providerId?: string | null;

  @ApiProperty({
    description: 'The main content of the notification.',
    example: 'This is a test notification content.',
    type: String,
  })
  content: string;

  @ApiPropertyOptional({
    description: 'The subject line for email notifications, if applicable.',
    nullable: true,
    example: 'Test Notification Subject',
    type: String,
  })
  subject?: string | null;

  @ApiProperty({
    description: 'The channel through which the notification is sent.',
    enum: [...Object.values(ChannelTypeEnum)],
    enumName: 'ChannelTypeEnum',
    type: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum;

  @ApiProperty({
    description: 'Indicates whether the notification has been read by the subscriber.',
    example: false,
    type: Boolean,
  })
  read: boolean;

  @ApiProperty({
    description: 'Indicates whether the notification has been seen by the subscriber.',
    example: true,
    type: Boolean,
  })
  seen: boolean;

  @ApiPropertyOptional({
    description: 'Device tokens for push notifications, if applicable.',
    type: [String],
    nullable: true,
    example: ['token1', 'token2'],
  })
  deviceTokens?: string[] | null;

  @ApiProperty({
    description: 'Call-to-action information associated with the notification.',
    type: MessageCTA,
  })
  cta: MessageCTA;

  @ApiProperty({
    description: 'Current status of the notification.',
    enum: ['sent', 'error', 'warning'],
    example: 'sent',
    type: String,
  })
  status: 'sent' | 'error' | 'warning';

  @ApiProperty({
    description: 'The payload that was used to send the notification trigger.',
    type: 'object',
    additionalProperties: true,
    required: false,
    example: { key: 'value' },
  })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'The data sent with the notification.',
    type: 'object',
    nullable: true,
    example: { key: 'value' },
    additionalProperties: true,
  })
  data?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Provider-specific overrides used when triggering the notification.',
    type: 'object',
    additionalProperties: true,
    required: false,
    example: { overrideKey: 'overrideValue' },
  })
  overrides?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Tags associated with the workflow that triggered the notification.',
    type: [String],
    nullable: true,
    example: ['tag1', 'tag2'],
  })
  tags?: string[] | null;
}

export class FeedResponseDto {
  @ApiPropertyOptional({
    description: 'Total number of notifications available.',
    example: 5,
    type: Number,
  })
  totalCount?: number;

  @ApiProperty({
    description: 'Indicates if there are more notifications to load.',
    example: true,
    type: Boolean,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Array of notifications returned in the response.',
    type: [NotificationFeedItemDto],
  })
  data: NotificationFeedItemDto[];

  @ApiProperty({
    description: 'The number of notifications returned in this response.',
    example: 2,
    type: Number,
  })
  pageSize: number;

  @ApiProperty({
    description: 'The current page number of the notifications.',
    example: 1,
    type: Number,
  })
  page: number;
}
