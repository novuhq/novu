import { ChannelTypeEnum } from '@novu/shared';
import { SoftDeleteModel } from 'mongoose-delete';
import { Document, FilterQuery, ProjectionType, Types } from 'mongoose';
import { BaseRepository, Omit } from '../base-repository';
import { MessageEntity } from './message.entity';
import { Message } from './message.schema';
import { FeedRepository } from '../feed';
import { DalException, ICacheService, Cached, InvalidateCache } from '../../shared';

class PartialMessageEntity extends Omit(MessageEntity, ['_environmentId', '_organizationId']) {}

type EnforceIdentifierQuery = FilterQuery<PartialMessageEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

type EnforceEnvironmentQuery = FilterQuery<PartialMessageEntity & Document> & { _environmentId: string } & (
    | { _id: string }
    | { _subscriberId: string }
  );

export class MessageRepository extends BaseRepository<EnforceIdentifierQuery, MessageEntity> {
  private message: SoftDeleteModel;
  private feedRepository = new FeedRepository();
  constructor(cacheService?: ICacheService) {
    super(Message, MessageEntity, cacheService);
    this.message = Message;
  }

  @InvalidateCache()
  async update(
    query: EnforceEnvironmentQuery,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    return super.update(query, updateBody);
  }

  @Cached()
  async findOne(query: EnforceEnvironmentQuery, select?: ProjectionType<any>) {
    return super.findOne(query, select);
  }

  @Cached()
  async find(
    query: EnforceEnvironmentQuery,
    select: ProjectionType<any> = '',
    options: { limit?: number; sort?: any; skip?: number } = {}
  ) {
    return super.find(query, select, options);
  }

  @InvalidateCache()
  async create(data: EnforceEnvironmentQuery) {
    return super.create(data);
  }

  private async getFilterQueryForMessage(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean } = {},
    options: { limit: number; skip?: number } = { limit: 10 }
  ): Promise<EnforceEnvironmentQuery> {
    const requestQuery: EnforceEnvironmentQuery = {
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
    }

    if (query.read != null) {
      requestQuery.read = query.read;
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
    const messages = await this.find(requestQuery, '', {
      limit: options.limit,
      skip: options.skip,
      sort: '-createdAt',
    });

    return messages;
  }

  async getTotalCount(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean } = {}
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, query);

    return await this.count(requestQuery);
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

    return await this.count(requestQuery);
  }

  async markAllUnseenAsSeen(subscriberId: string, environmentId: string) {
    return this.update(
      { _subscriberId: subscriberId, _environmentId: environmentId, seen: false },
      { $set: { seen: true, lastSeenDate: new Date() } }
    );
  }

  async updateFeedByMessageTemplateId(environmentId: string, messageId: string, feedId: string) {
    return this.update({ _environmentId: environmentId, _messageTemplateId: messageId } as MessageEntity, {
      $set: {
        _feedId: feedId,
      },
    });
  }

  async updateMessageStatus(
    environmentId: string,
    _subscriberId: string,
    id: string,
    status: 'error' | 'sent' | 'warning',
    // eslint-disable-next-line
    providerPayload: any = {},
    errorId: string,
    errorText: string
  ) {
    return await this.update(
      {
        _subscriberId,
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

  async getActivityGraphStats(date: Date, environmentId: string) {
    return await this.aggregate([
      {
        $match: {
          createdAt: { $gte: date },
          _environmentId: new Types.ObjectId(environmentId),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: {
            $sum: 1,
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);
  }

  async getFeed(
    environmentId: string,
    _subscriberId: string,
    query: { channels?: ChannelTypeEnum[]; templates?: string[]; emails?: string[] } = {},
    skip = 0,
    limit = 10
  ) {
    const requestQuery: EnforceIdentifierQuery = {
      _environmentId: environmentId,
      _subscriberId,
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

    if (query?.emails) {
      requestQuery.email = {
        $in: query.emails,
      };
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

  @InvalidateCache()
  async delete(query: EnforceEnvironmentQuery) {
    const message = await this.findOne({
      _id: query._id,
      _environmentId: query._environmentId,
    } as EnforceEnvironmentQuery);
    if (!message) {
      throw new DalException(`Could not find a message with id ${query._id}`);
    }

    if (this.cacheService?.cacheEnabled()) {
      this.cacheService.delByPattern(`Message*${message._subscriberId}:${message._environmentId}`);
    }
    await this.message.delete({ _id: message._id, _environmentId: message._environmentId });
  }

  @Cached()
  async findDeleted(query: EnforceEnvironmentQuery): Promise<MessageEntity> {
    const res = await this.message.findDeleted(query);

    return this.mapEntity(res);
  }
}
