import { ChannelTypeEnum, ActorTypeEnum } from '@novu/shared';
import { SoftDeleteModel } from 'mongoose-delete';
import { FilterQuery, Types } from 'mongoose';

import { BaseRepository } from '../base-repository';
import { MessageEntity, MessageDBModel } from './message.entity';
import { Message } from './message.schema';
import { FeedRepository } from '../feed';
import { DalException } from '../../shared';
import { EnforceEnvId } from '../../types/enforce';

type MessageQuery = FilterQuery<MessageDBModel>;

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
    query: { feedId?: string[]; seen?: boolean; read?: boolean } = {}
  ): Promise<MessageQuery & EnforceEnvId> {
    const requestQuery: MessageQuery & EnforceEnvId = {
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

    return requestQuery;
  }

  async findBySubscriberChannel(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean } = {},
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

  async getTotalCount(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean } = {}
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, query);

    return this.MongooseModel.countDocuments(requestQuery).read('secondaryPreferred');
  }

  async getCount(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean } = {}
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, {
      feedId: query.feedId,
      seen: query.seen,
      read: query.read,
    });

    return this.MongooseModel.countDocuments(requestQuery).read('secondaryPreferred');
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
    markAs: 'read' | 'seen';
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

    const updateQuery: Partial<MessageEntity> & EnforceEnvId = {
      _subscriberId: subscriberId,
      _environmentId: environmentId,
      [markAs]: false,
    };

    if (feedQuery != null) {
      updateQuery._feedId = feedQuery;
    }

    if (channel != null) {
      updateQuery.channel = channel;
    }

    const now = new Date();
    const updatePayload = {
      seen: true,
      lastSeenDate: now,
      ...(markAs === 'read' && {
        read: true,
        lastReadDate: now,
      }),
    };

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

    await this.message.delete({ _id: message._id, _environmentId: message._environmentId });
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

  async getMessages(
    query: Partial<MessageEntity> & { _environmentId: string },
    select = '',
    options?: {
      limit?: number;
      skip?: number;
    }
  ) {
    const data = await this.MongooseModel.find(query, select, {
      limit: options?.limit,
      skip: options?.skip,
    })
      .populate('subscriber', '_id firstName lastName avatar subscriberId')
      .populate('actorSubscriber', '_id firstName lastName avatar subscriberId');

    return this.mapEntities(data);
  }
}
