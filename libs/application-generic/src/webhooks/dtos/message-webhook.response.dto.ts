import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MessageEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import type { ChannelData } from '@novu/stateless';

type MessageWebhookEntityFields = Pick<
  MessageEntity,
  | '_id'
  | '_templateId'
  | '_environmentId'
  | '_organizationId'
  | '_notificationId'
  | 'actorSubscriber'
  | 'templateIdentifier'
  | 'stepId'
  | 'createdAt'
  | 'updatedAt'
  | 'archivedAt'
  | 'archived'
  | 'transactionId'
  | 'channel'
  | 'seen'
  | 'read'
  | 'snoozedUntil'
  | 'deliveredAt'
  | 'providerId'
  | 'lastSeenDate'
  | 'firstSeenDate'
  | 'lastReadDate'
  | 'status'
  | 'errorId'
  | 'errorText'
  | 'contextKeys'
>;

type OptionalMessageWebhookEntityField =
  | 'actorSubscriber'
  | 'stepId'
  | 'archivedAt'
  | 'snoozedUntil'
  | 'deliveredAt'
  | 'lastSeenDate'
  | 'firstSeenDate'
  | 'lastReadDate'
  | 'errorId'
  | 'errorText'
  | 'contextKeys';

type MessageWebhookResponseContract = Omit<MessageWebhookEntityFields, OptionalMessageWebhookEntityField> &
  Partial<Pick<MessageWebhookEntityFields, OptionalMessageWebhookEntityField>> & {
    providerResponseId?: string;
    deviceToken?: string;
    webhookUrl?: string;
    channelData?: ChannelData;
    subscriberId: string;
    workflowId: string;
  };

export const MessageWebhookStatusEnum = {
  SENT: 'sent',
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export type MessageWebhookStatus = (typeof MessageWebhookStatusEnum)[keyof typeof MessageWebhookStatusEnum];

export class MessageWebhookActorSubscriberDto {
  @ApiProperty({ description: 'Database identifier of the actor subscriber' })
  _id: string;

  @ApiProperty({ description: 'External subscriber identifier of the actor' })
  subscriberId: string;

  @ApiPropertyOptional({ description: 'First name of the actor' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the actor' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email of the actor' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the actor' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL of the actor' })
  avatar?: string;

  @ApiPropertyOptional({ description: 'Locale of the actor' })
  locale?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Custom actor subscriber data',
  })
  data?: Record<string, unknown>;
}

export class MessageWebhookChannelDataDto {
  @ApiProperty({ description: 'Channel endpoint type, for example `slack_channel` or `webhook`' })
  type: string;

  @ApiProperty({ description: 'Identifier of the channel endpoint' })
  identifier: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Provider-specific endpoint payload. Secrets such as tokens are redacted when present.',
  })
  endpoint: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Redacted provider token when required by the endpoint type' })
  token?: string;

  @ApiPropertyOptional({ description: 'Microsoft Teams tenant identifier' })
  subscriberTenantId?: string;

  @ApiPropertyOptional({ description: 'Microsoft Teams client identifier' })
  clientId?: string;
}

export class MessageWebhookResponseDto implements MessageWebhookResponseContract {
  @ApiProperty({ description: 'Database identifier of the message' })
  _id: string;

  @ApiProperty({ description: 'Database identifier of the workflow that produced the message' })
  _templateId: string;

  @ApiProperty({ description: 'Environment identifier' })
  _environmentId: string;

  @ApiProperty({ description: 'Organization identifier' })
  _organizationId: string;

  @ApiProperty({ description: 'Database identifier of the notification' })
  _notificationId: string;

  @ApiProperty({
    description:
      'Subscriber identifier supplied by the producer. Direct send and Inbox events use the external subscriber identifier.',
  })
  subscriberId: string;

  @ApiPropertyOptional({ type: () => MessageWebhookActorSubscriberDto })
  actorSubscriber?: MessageEntity['actorSubscriber'];

  @ApiProperty({ description: 'Workflow identifier used when triggering the workflow' })
  templateIdentifier: string;

  @ApiProperty({ description: 'Same as `templateIdentifier`. Included for correlation with workflow events.' })
  workflowId: string;

  @ApiPropertyOptional({ description: 'Step identifier used when correlating with workflow steps' })
  stepId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Archive timestamp' })
  archivedAt?: string;

  @ApiProperty({ description: 'Whether the message is archived' })
  archived: boolean;

  @ApiProperty({ description: 'Trigger transaction identifier' })
  transactionId: string;

  @ApiProperty({ enum: ChannelTypeEnum, enumName: 'ChannelTypeEnum', description: 'Channel the message was sent on' })
  channel: ChannelTypeEnum;

  @ApiProperty({ description: 'Whether the message has been seen' })
  seen: boolean;

  @ApiProperty({ description: 'Whether the message has been read' })
  read: boolean;

  @ApiPropertyOptional({ description: 'When set, the Inbox message is snoozed until this timestamp' })
  snoozedUntil?: string;

  @ApiPropertyOptional({ type: [String], description: 'Delivery timestamps recorded for the message' })
  deliveredAt?: string[];

  @ApiProperty({ description: 'Provider identifier that delivered the message' })
  providerId: string;

  @ApiPropertyOptional({ description: 'Last time the message was seen' })
  lastSeenDate?: string;

  @ApiPropertyOptional({ description: 'First time the message was seen' })
  firstSeenDate?: string;

  @ApiPropertyOptional({ description: 'Last time the message was read' })
  lastReadDate?: string;

  @ApiProperty({
    enum: MessageWebhookStatusEnum,
    enumName: 'MessageWebhookStatusEnum',
    description: 'Delivery status stored on the message',
  })
  status: MessageWebhookStatus;

  @ApiPropertyOptional({ description: 'Provider or internal error identifier when delivery failed' })
  errorId?: string;

  @ApiPropertyOptional({ description: 'Provider or internal error text when delivery failed' })
  errorText?: string;

  @ApiPropertyOptional({ type: [String], description: 'Context keys associated with the message' })
  contextKeys?: string[];

  @ApiPropertyOptional({ description: 'Provider response identifier for the send attempt' })
  providerResponseId?: string;

  @ApiPropertyOptional({ description: 'Device token used for a push send' })
  deviceToken?: string;

  @ApiPropertyOptional({ description: 'Deprecated, use `channelData`. Chat webhook URL used for the send.' })
  webhookUrl?: string;

  @ApiPropertyOptional({ type: () => MessageWebhookChannelDataDto })
  channelData?: ChannelData;
}

export enum MessageWebhookPushFailureReasonEnum {
  TOKEN_INVALID = 'token_invalid',
  GENERIC_ERROR = 'generic_error',
}

export class MessageWebhookPushErrorDto {
  @ApiProperty({
    enum: MessageWebhookPushFailureReasonEnum,
    enumName: 'MessageWebhookPushFailureReasonEnum',
    description: 'Why the push send failed',
  })
  reason: MessageWebhookPushFailureReasonEnum;

  @ApiProperty({ description: 'Device token that failed' })
  deviceToken: string;
}

export class MessageWebhookErrorDto {
  @ApiProperty({ description: 'Error message from the provider or send attempt' })
  message: string;

  @ApiPropertyOptional({ type: () => MessageWebhookPushErrorDto })
  push?: MessageWebhookPushErrorDto;
}

export class MessageWebhookPayloadDto {
  @ApiProperty({ type: () => MessageWebhookResponseDto })
  object: MessageWebhookResponseDto;
}

export class MessageWebhookPayloadWithErrorDto {
  @ApiProperty({ type: () => MessageWebhookResponseDto })
  object: MessageWebhookResponseDto;

  @ApiPropertyOptional({ type: () => MessageWebhookErrorDto })
  error?: MessageWebhookErrorDto;
}
