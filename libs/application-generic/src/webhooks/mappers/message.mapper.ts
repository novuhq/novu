import { MessageEntity } from '@novu/dal';
import { ChannelData } from '@novu/stateless';
import { MessageWebhookResponseDto } from '../dtos';

export const messageWebhookMapper = (
  message: MessageEntity,
  subscriberId: string,
  context?: {
    providerResponseId?: string;
    deviceToken?: string;
    /**
     * @deprecated use channelData instead
     */
    webhookUrl?: string;
    channelData?: ChannelData;
  }
): MessageWebhookResponseDto => {
  return {
    _id: message._id,
    _templateId: message._templateId,
    _environmentId: message._environmentId,
    _organizationId: message._organizationId,
    _notificationId: message._notificationId,
    subscriberId,
    actorSubscriber: message.actorSubscriber,
    templateIdentifier: message.templateIdentifier,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    archivedAt: message.archivedAt,
    archived: message.archived,
    transactionId: message.transactionId,
    channel: message.channel,
    seen: message.seen,
    read: message.read,
    snoozedUntil: message.snoozedUntil,
    deliveredAt: message.deliveredAt,
    providerId: message.providerId,
    lastSeenDate: message.lastSeenDate,
    firstSeenDate: message.firstSeenDate,
    lastReadDate: message.lastReadDate,
    status: message.status,
    errorId: message.errorId,
    errorText: message.errorText,
    deviceToken: context?.deviceToken,
    webhookUrl: context?.webhookUrl,
    channelData: context?.channelData,
    providerResponseId: context?.providerResponseId,
  };
};
