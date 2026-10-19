import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, SeverityLevelEnum } from '@novu/shared';

export class InboxSubscriberResponseDto {
  @ApiProperty({ type: String, description: 'Unique identifier of the subscriber' })
  id: string;

  @ApiPropertyOptional({ type: String, description: 'First name of the subscriber' })
  firstName?: string;

  @ApiPropertyOptional({ type: String, description: 'Last name of the subscriber' })
  lastName?: string;

  @ApiPropertyOptional({ type: String, description: 'Avatar URL of the subscriber' })
  avatar?: string;

  @ApiProperty({ type: String, description: 'External subscriber identifier' })
  subscriberId: string;
}

export class RedirectDto {
  @ApiProperty({ type: String, description: 'URL to redirect to' })
  url: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Target attribute for the redirect link',
    enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'],
  })
  target?: '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop';
}

export class InboxActionDto {
  @ApiProperty({ type: String, description: 'Label of the action button' })
  label: string;

  @ApiProperty({ type: Boolean, description: 'Whether the action has been completed' })
  isCompleted: boolean;

  @ApiPropertyOptional({ type: RedirectDto, description: 'Redirect configuration for the action' })
  redirect?: RedirectDto;
}

export class NotificationWorkflowDto {
  @ApiProperty({ type: String, description: 'Unique identifier of the workflow' })
  id: string;

  @ApiProperty({ type: String, description: 'Workflow identifier used for triggering' })
  identifier: string;

  @ApiProperty({ type: String, description: 'Human-readable name of the workflow' })
  name: string;

  @ApiProperty({ type: Boolean, description: 'Whether this workflow is marked as critical' })
  critical: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Tags associated with the workflow' })
  tags?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Custom data associated with the workflow',
  })
  data?: Record<string, unknown>;

  @ApiProperty({
    enum: SeverityLevelEnum,
    enumName: 'SeverityLevelEnum',
    description: 'Severity level of the workflow',
  })
  severity: SeverityLevelEnum;
}

export class InboxNotificationDto {
  @ApiProperty({ type: String, description: 'Unique identifier of the notification' })
  id: string;

  @ApiProperty({ type: String, description: 'Transaction identifier of the notification' })
  transactionId: string;

  @ApiPropertyOptional({ type: String, description: 'Subject of the notification' })
  subject?: string;

  @ApiProperty({ type: String, description: 'Body content of the notification' })
  body: string;

  @ApiProperty({ type: InboxSubscriberResponseDto, description: 'Subscriber this notification was sent to' })
  to: InboxSubscriberResponseDto;

  @ApiProperty({ type: Boolean, description: 'Whether the notification has been read' })
  isRead: boolean;

  @ApiProperty({ type: Boolean, description: 'Whether the notification has been seen' })
  isSeen: boolean;

  @ApiProperty({ type: Boolean, description: 'Whether the notification has been archived' })
  isArchived: boolean;

  @ApiProperty({ type: Boolean, description: 'Whether the notification is snoozed' })
  isSnoozed: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ISO timestamp when the notification will be unsnoozed',
  })
  snoozedUntil?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Timestamps when the notification was delivered' })
  deliveredAt?: string[];

  @ApiProperty({ type: String, description: 'ISO timestamp when the notification was created' })
  createdAt: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'ISO timestamp when the notification was read' })
  readAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ISO timestamp when the notification was first seen',
  })
  firstSeenAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ISO timestamp when the notification was archived',
  })
  archivedAt?: string | null;

  @ApiPropertyOptional({ type: String, description: 'Avatar URL for the notification' })
  avatar?: string;

  @ApiPropertyOptional({ type: InboxActionDto, description: 'Primary action button for the notification' })
  primaryAction?: InboxActionDto;

  @ApiPropertyOptional({ type: InboxActionDto, description: 'Secondary action button for the notification' })
  secondaryAction?: InboxActionDto;

  @ApiProperty({ enum: ChannelTypeEnum, enumName: 'ChannelTypeEnum', description: 'Channel type of the notification' })
  channelType: ChannelTypeEnum;

  @ApiPropertyOptional({ type: [String], description: 'Tags associated with the notification' })
  tags?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Custom data payload of the notification',
  })
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ type: RedirectDto, description: 'Redirect configuration for the notification' })
  redirect?: RedirectDto;

  @ApiPropertyOptional({ type: NotificationWorkflowDto, description: 'Workflow associated with the notification' })
  workflow?: NotificationWorkflowDto;

  @ApiProperty({
    enum: SeverityLevelEnum,
    enumName: 'SeverityLevelEnum',
    description: 'Severity level of the notification',
  })
  severity: SeverityLevelEnum;
}
