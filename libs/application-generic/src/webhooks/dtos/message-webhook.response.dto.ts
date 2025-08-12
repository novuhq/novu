import { MessageEntity } from '@novu/dal';

export type MessageWebhookResponseDto = Pick<
  MessageEntity,
  | '_id'
  | '_templateId'
  | '_environmentId'
  | '_organizationId'
  | '_notificationId'
  | 'actorSubscriber'
  | 'templateIdentifier'
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
> & {
  providerResponseId?: string;
  deviceToken?: string;
  webhookUrl?: string;
  subscriberId?: string;
};
