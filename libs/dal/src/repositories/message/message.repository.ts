import { ChannelTypeEnum, IMessage } from '@notifire/shared';
import { FilterQuery, PopulateOptions } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { MessageEntity } from './message.entity';
import { Message } from './message.schema';
import { Notification } from '../notification';
import { NotificationTemplateEntity } from '../notification-template';

export class MessageRepository extends BaseRepository<MessageEntity> {
  constructor() {
    super(Message, MessageEntity);
  }

  async findBySubscriberChannel(
    applicationId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    options: { limit: number; skip?: number } = { limit: 10 }
  ) {
    return await this.find(
      {
        _applicationId: applicationId,
        _subscriberId: subscriberId,
        channel,
      },
      '',
      {
        limit: options.limit,
        skip: options.skip,
        sort: '-createdAt',
      }
    );
  }

  async getUnseenCount(applicationId: string, subscriberId: string, channel: ChannelTypeEnum) {
    return await this.count({
      _applicationId: applicationId,
      _subscriberId: subscriberId,
      seen: false,
      channel,
    });
  }

  async changeSeenStatus(subscriberId: string, messageId: string, isSeen: boolean) {
    return this.update(
      {
        _subscriberId: subscriberId,
        _id: messageId,
      },
      {
        $set: {
          seen: isSeen,
          lastSeenDate: new Date(),
        },
      }
    );
  }

  async getBulkMessagesByNotificationIds(applicationId: string, notificationIds: string[]) {
    return this.find({
      _applicationId: applicationId,
      _notificationId: {
        $in: notificationIds,
      },
    });
  }

  async updateMessageStatus(
    id: string,
    status: 'error' | 'sent' | 'warning',
    providerPayload: any = {},
    errorId: string,
    errorText: string
  ) {
    return await this.update(
      {
        _id: id,
      },
      {
        $set: {
          status,
          errorId,
          errorText,
          providerPayload,
        },
      }
    );
  }

  async getFeed(
    applicationId: string,
    query: { channels?: ChannelTypeEnum[]; templates?: string[]; subscriberId?: string } = {},
    skip = 0,
    limit = 10
  ) {
    const requestQuery: FilterQuery<NotificationTemplateEntity> = {
      _applicationId: applicationId,
    };

    if (query?.channels) {
      requestQuery.channel = {
        $in: query.channels,
      };
    }

    if (query?.templates) {
      requestQuery._templateId = {
        $in: query.templates,
      };
    }

    if (query?.subscriberId) {
      requestQuery._subscriberId = query?.subscriberId;
    }

    const totalCount = await this.count(requestQuery);
    const response = await Message.find(requestQuery)
      .populate('subscriber', 'firstName _id lastName email')
      .populate('template', 'name _id')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return {
      totalCount,
      data: this.mapEntities(response),
    };
  }
}
