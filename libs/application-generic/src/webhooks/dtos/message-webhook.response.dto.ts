import { MessageEntity } from '@novu/dal';
import { ChannelData } from '@novu/stateless';

export type MessageWebhookResponseDto = Pick<
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
> & {
  providerResponseId?: string;
  deviceToken?: string;
  webhookUrl?: string;
  channelData?: ChannelData;
  subscriberId?: string;
  workflowId?: string;
};
