import { SoftDeleteModel } from 'mongoose-delete';
import { FilterQuery, Types } from 'mongoose';
import { MarkMessagesAsEnum, ChannelTypeEnum, ActorTypeEnum } from '@novu/shared';

import { BaseRepository } from '../base-repository';
import { MessageEntity, MessageDBModel } from './message.entity';
import { Message } from './message.schema';
import { FeedRepository } from '../feed';
import { DalException } from '../../shared';
import { EnforceEnvId } from '../../types/enforce';

type MessageQuery = FilterQuery<MessageDBModel>;

const getEntries = (obj: object, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    Object(value) === value ? getEntries(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
  );

const getFlatObject = (obj: object) => {
  return Object.fromEntries(getEntries(obj));
};

export class MessageRepository extends BaseRepository<MessageDBModel, MessageEntity, EnforceEnvId> {
  private message: SoftDeleteModel;
  private feedRepository = new FeedRepository();
  constructor() {
    super(Message, MessageEntity);
    this.message = Message;
  }

  private async getFilterQueryForMessage(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean; payload?: object } = {}
  ): Promise<MessageQuery & EnforceEnvId> {
    let requestQuery: MessageQuery & EnforceEnvId = {
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      channel,
    };

    if (query.feedId === null) {
      requestQuery._feedId = { $eq: null };
    }

    if (query.feedId) {
      const feeds = await this.feedRepository.find(
        {
          _environmentId: environmentId,
          identifier: {
            $in: query.feedId,
          },
        },
        '_id'
      );
      requestQuery._feedId = {
        $in: feeds.map((feed) => feed._id),
      };
    }

    if (query.seen != null) {
      requestQuery.seen = query.seen;
    } else {
      requestQuery.seen = { $in: [true, false] };
    }

    if (query.read != null) {
      requestQuery.read = query.read;
    } else {
      requestQuery.read = { $in: [true, false] };
    }

    if (query.payload) {
      requestQuery = {
        ...requestQuery,
        ...getFlatObject({ payload: query.payload }),
      };
    }

    return requestQuery;
  }

  async findBySubscriberChannel(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean; payload?: object } = {},
    options: { limit: number; skip?: number } = { limit: 10 }
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, query);

    const messages = await this.MongooseModel.find(requestQuery, '', {
      limit: options.limit,
      skip: options.skip,
      sort: '-createdAt',
    })
      .read('secondaryPreferred')
      .populate('subscriber', '_id firstName lastName avatar subscriberId')
      .populate('actorSubscriber', '_id firstName lastName avatar subscriberId');

    return this.mapEntities(messages);
  }

  async getCount(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean; payload?: object } = {},
    options: { limit: number; skip?: number } = { limit: 100, skip: 0 }
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, {
      feedId: query.feedId,
      seen: query.seen,
      read: query.read,
      payload: query.payload,
    });

    return this.MongooseModel.countDocuments(requestQuery, options).read('secondaryPreferred');
  }

  private getReadSeenUpdateQuery(
    subscriberId: string,
    environmentId: string,
    markAs: MarkMessagesAsEnum
  ): Partial<MessageEntity> & EnforceEnvId {
    const updateQuery: Partial<MessageEntity> & EnforceEnvId = {
      _subscriberId: subscriberId,
      _environmentId: environmentId,
    };

    switch (markAs) {
      case MarkMessagesAsEnum.READ:
        return {
          ...updateQuery,
          read: false,
        };
      case MarkMessagesAsEnum.UNREAD:
        return {
          ...updateQuery,
          read: true,
        };
      case MarkMessagesAsEnum.SEEN:
        return {
          ...updateQuery,
          seen: false,
        };
      case MarkMessagesAsEnum.UNSEEN:
        return {
          ...updateQuery,
          seen: true,
        };
      default:
        return updateQuery;
    }
  }

  private getReadSeenUpdatePayload(markAs: MarkMessagesAsEnum): {
    read?: boolean;
    lastReadDate?: Date;
    seen?: boolean;
    lastSeenDate?: Date;
  } {
    const now = new Date();

    switch (markAs) {
      case MarkMessagesAsEnum.READ:
        return {
          read: true,
          lastReadDate: now,
          seen: true,
          lastSeenDate: now,
        };
      case MarkMessagesAsEnum.UNREAD:
        return {
          read: false,
          lastReadDate: now,
          seen: true,
          lastSeenDate: now,
        };
      case MarkMessagesAsEnum.SEEN:
        return {
          seen: true,
          lastSeenDate: now,
        };
      case MarkMessagesAsEnum.UNSEEN:
        return {
          seen: false,
          lastSeenDate: now,
        };
      default:
        return {};
    }
  }

  async markAllMessagesAs({
    subscriberId,
    environmentId,
    markAs,
    channel,
    feedIdentifiers,
  }: {
    subscriberId: string;
    environmentId: string;
    markAs: MarkMessagesAsEnum;
    channel?: ChannelTypeEnum;
    feedIdentifiers?: string[];
  }) {
    let feedQuery;

    if (feedIdentifiers) {
      const feeds = await this.feedRepository.find(
        {
          _environmentId: environmentId,
          identifier: {
            $in: feedIdentifiers,
          },
        },
        '_id'
      );

      feedQuery = {
        $in: feeds.map((feed) => feed._id),
      };
    }

    const updateQuery = this.getReadSeenUpdateQuery(subscriberId, environmentId, markAs);

    if (feedQuery != null) {
      updateQuery._feedId = feedQuery;
    }

    if (channel != null) {
      updateQuery.channel = channel;
    }

    const updatePayload = this.getReadSeenUpdatePayload(markAs);

    return await this.update(updateQuery, {
      $set: updatePayload,
    });
  }

  async updateFeedByMessageTemplateId(environmentId: string, messageId: string, feedId?: string | null) {
    return this.update(
      { _environmentId: environmentId, _messageTemplateId: messageId },
      {
        $set: {
          _feedId: feedId,
        },
      }
    );
  }

  async updateMessageStatus(
    environmentId: string,
    id: string,
    status: 'error' | 'sent' | 'warning',
    // eslint-disable-next-line
    providerPayload: any = {},
    errorId: string,
    errorText: string
  ) {
    return await this.update(
      {
        _environmentId: environmentId,
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

  async changeMessagesStatus({
    environmentId,
    subscriberId,
    messageIds,
    markAs,
  }: {
    environmentId: string;
    subscriberId: string;
    messageIds: string[];
    markAs: MarkMessagesAsEnum;
  }) {
    const updatePayload = this.getReadSeenUpdatePayload(markAs);

    await this.update(
      {
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        _id: {
          $in: messageIds.map((id) => {
            return new Types.ObjectId(id);
          }),
        },
      },
      {
        $set: updatePayload,
      }
    );
  }

  async changeStatus(
    environmentId: string,
    subscriberId: string,
    messageIds: string[],
    mark: { seen?: boolean; read?: boolean }
  ) {
    const requestQuery: FilterQuery<MessageEntity> = {};

    if (mark.seen != null) {
      requestQuery.seen = mark.seen;
      requestQuery.lastSeenDate = new Date();
    }

    if (mark.read != null) {
      requestQuery.read = mark.read;
      requestQuery.lastReadDate = new Date();
    }

    await this.update(
      {
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        _id: {
          $in: messageIds.map((id) => {
            return new Types.ObjectId(id);
          }),
        },
      },
      {
        $set: requestQuery,
      }
    );
  }

  async delete(query: MessageQuery) {
    const message = await this.findOne({
      _id: query._id,
      _environmentId: query._environmentId,
    });

    if (!message) {
      throw new DalException(`Could not find a message with id ${query._id}`);
    }

    return await this.message.delete({ _id: message._id, _environmentId: message._environmentId });
  }

  async deleteMany(query: MessageQuery) {
    try {
      return await this.message.delete({ ...query, deleted: false });
    } catch (e) {
      throw new DalException(e);
    }
  }

  async findDeleted(query: MessageQuery): Promise<MessageEntity> {
    const res: MessageEntity = await this.message.findDeleted(query);

    return this.mapEntity(res);
  }

  async findMessageById(query: { _id: string; _environmentId: string }): Promise<MessageEntity | null> {
    const res = await this.MongooseModel.findOne({ _id: query._id, _environmentId: query._environmentId })
      .populate('subscriber')
      .populate({
        path: 'actorSubscriber',
        match: {
          'actor.type': ActorTypeEnum.USER,
          _actorId: { $exists: true },
        },
        select: '_id firstName lastName avatar subscriberId',
      });

    return this.mapEntity(res);
  }

  async findMessagesByTransactionId(
    query: {
      transactionId: string[];
      _environmentId: string;
    } & Partial<Omit<MessageEntity, 'transactionId'>>
  ) {
    const res = await this.MongooseModel.find({
      transactionId: {
        $in: query.transactionId,
      },
      _environmentId: query._environmentId,
    })
      .populate('subscriber')
      .populate({
        path: 'actorSubscriber',
        match: {
          'actor.type': ActorTypeEnum.USER,
          _actorId: { $exists: true },
        },
        select: '_id firstName lastName avatar subscriberId',
      });

    return this.mapEntities(res);
  }

  async getMessages(
    query: Partial<Omit<MessageEntity, 'transactionId'>> & {
      _environmentId: string;
      transactionId?: string[];
    },
    select = '',
    options?: {
      limit?: number;
      skip?: number;
    }
  ) {
    const filterQuery: FilterQuery<MessageEntity> = { ...query };
    if (query.transactionId) {
      filterQuery.transactionId = { $in: query.transactionId };
    }
    const data = await this.MongooseModel.find(query, select, {
      limit: options?.limit,
      skip: options?.skip,
    })
      .read('secondaryPreferred')
      .populate('subscriber', '_id firstName lastName avatar subscriberId')
      .populate('actorSubscriber', '_id firstName lastName avatar subscriberId');

    return this.mapEntities(data);
  }
}
