import { FilterQuery, Types } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { SortOrder } from '../../types/sort-order';
import { BaseRepository } from '../base-repository';
import { TopicDBModel, TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, TopicId, TopicKey, TopicName } from './types';

const TOPIC_SUBSCRIBERS_COLLECTION = 'topicsubscribers';

const topicWithSubscribersProjection = {
  $project: {
    _id: 1,
    _environmentId: 1,
    _organizationId: 1,
    createdAt: 1,
    updatedAt: 1,
    key: 1,
    name: 1,
    subscribers: '$topicSubscribers.externalSubscriberId',
  },
};

const lookup = {
  $lookup: {
    from: TOPIC_SUBSCRIBERS_COLLECTION,
    localField: '_id',
    foreignField: '_topicId',
    as: 'topicSubscribers',
  },
};

export class TopicRepository extends BaseRepository<TopicDBModel, TopicEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Topic, TopicEntity);
  }

  async createTopic(entity: Omit<TopicEntity, '_id'>): Promise<TopicEntity> {
    const { key, name, _environmentId, _organizationId } = entity;

    return await this.create({
      _environmentId,
      key,
      name,
      _organizationId,
    });
  }

  async deleteTopic(key: TopicKey, environmentId: EnvironmentId, organizationId: OrganizationId): Promise<void> {
    await this.delete({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
  }

  async filterTopics(
    query: FilterQuery<TopicDBModel>,
    pagination: { limit: number; skip: number }
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }[]> {
    const parsedQuery = { ...query };
    if (query._id) {
      parsedQuery._id = this.convertStringToObjectId(query._id);
    }

    parsedQuery._environmentId = this.convertStringToObjectId(query._environmentId);
    parsedQuery._organizationId = this.convertStringToObjectId(query._organizationId);

    const data = await this.aggregate([
      {
        $match: parsedQuery,
      },
      lookup,
      topicWithSubscribersProjection,
      {
        $skip: pagination.skip,
      },
      {
        $limit: pagination.limit,
      },
    ]);

    return data;
  }

  async findTopic(
    topicKey: TopicKey,
    environmentId: EnvironmentId
  ): Promise<(TopicEntity & { subscribers: ExternalSubscriberId[] }) | null> {
    const [result] = await this.aggregate([
      {
        $match: { _environmentId: this.convertStringToObjectId(environmentId), key: topicKey },
      },
      lookup,
      topicWithSubscribersProjection,
      { $limit: 1 },
    ]);

    if (!result) {
      return null;
    }

    return result;
  }

  async findTopicByKey(
    key: TopicKey,
    organizationId: OrganizationId,
    environmentId: EnvironmentId
  ): Promise<TopicEntity | null> {
    return await this.findOne({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
  }

  async renameTopic(
    _id: TopicId,
    _environmentId: EnvironmentId,
    name: TopicName
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }> {
    await this.update(
      {
        _id,
        _environmentId,
      },
      {
        name,
      }
    );

    const [updatedTopic] = await this.aggregate([
      {
        $match: {
          _id: this.convertStringToObjectId(_id),
          _environmentId: this.convertStringToObjectId(_environmentId),
        },
      },
      lookup,
      topicWithSubscribersProjection,
      {
        $limit: 1,
      },
    ]);

    return updatedTopic;
  }

  estimatedDocumentCount() {
    return this.MongooseModel.estimatedDocumentCount();
  }

  async listTopics({
    organizationId,
    environmentId,
    limit = 10,
    after,
    before,
    key,
    name,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    key?: string;
    name?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
  }): Promise<{
    topics: TopicEntity[];
    next: string | null;
    previous: string | null;
  }> {
    const match: any = {
      _organizationId: new Types.ObjectId(organizationId),
      _environmentId: new Types.ObjectId(environmentId),
    };

    if (key) {
      match.key = { $regex: key, $options: 'i' };
    }

    if (name) {
      match.name = { $regex: name, $options: 'i' };
    }

    const cursor: {
      next: string | null;
      previous: string | null;
      topics: TopicEntity[];
    } = {
      next: null,
      previous: null,
      topics: [],
    };

    const sort = {
      [sortBy]: sortDirection === 1 ? 1 : -1,
      _id: 1,
    };

    const pipeline: any[] = [
      {
        $match: match,
      },
      { $sort: sort },
    ];

    if (before) {
      const decodedCursor = Buffer.from(before, 'base64').toString('utf-8');
      const parsedCursor = JSON.parse(decodedCursor);

      const cursorMatch: any = { $or: [] };

      // Handling reverse sorting
      if (sortDirection === -1 && sortBy !== '_id') {
        // Case: sortValue === cursorSortValue and _id > cursorId
        cursorMatch.$or.push({
          [sortBy]: parsedCursor[sortBy],
          _id: { $gt: new Types.ObjectId(parsedCursor._id) },
        });

        // Case: sortValue > cursorSortValue
        cursorMatch.$or.push({
          [sortBy]: { $gt: parsedCursor[sortBy] },
        });
      } else {
        // Case: sortValue === cursorSortValue and _id < cursorId
        cursorMatch.$or.push({
          [sortBy]: parsedCursor[sortBy],
          _id: { $lt: new Types.ObjectId(parsedCursor._id) },
        });

        // Case: sortValue < cursorSortValue
        cursorMatch.$or.push({
          [sortBy]: { $lt: parsedCursor[sortBy] },
        });
      }

      pipeline.unshift({
        $match: cursorMatch,
      });
    }

    if (after) {
      const decodedCursor = Buffer.from(after, 'base64').toString('utf-8');
      const parsedCursor = JSON.parse(decodedCursor);

      const cursorMatch: any = { $or: [] };

      // Handling reverse sorting
      if (sortDirection === -1 && sortBy !== '_id') {
        // Case: sortValue === cursorSortValue and _id < cursorId
        cursorMatch.$or.push({
          [sortBy]: parsedCursor[sortBy],
          _id: { $lt: new Types.ObjectId(parsedCursor._id) },
        });

        // Case: sortValue < cursorSortValue
        cursorMatch.$or.push({
          [sortBy]: { $lt: parsedCursor[sortBy] },
        });
      } else {
        // Case: sortValue === cursorSortValue and _id > cursorId
        cursorMatch.$or.push({
          [sortBy]: parsedCursor[sortBy],
          _id: { $gt: new Types.ObjectId(parsedCursor._id) },
        });

        // Case: sortValue > cursorSortValue
        cursorMatch.$or.push({
          [sortBy]: { $gt: parsedCursor[sortBy] },
        });
      }

      pipeline.unshift({
        $match: cursorMatch,
      });
    }

    pipeline.push({ $limit: limit + 1 });

    // Using a cursor to loop through the results but limiting, will allow us to check if there are more results
    const topics = await this.aggregate(pipeline);

    const hasNext = topics.length > limit;
    if (hasNext) {
      topics.pop();
    }

    if (topics.length) {
      let startCursor;
      let endCursor;

      // When going backward and the cursor was found, we need to reverse the results
      if (before) {
        topics.reverse();
      }

      if (!includeCursor) {
        cursor.topics = this.mapEntities(topics);
        if (topics.length > 0) {
          startCursor = topics[0];
          endCursor = topics[topics.length - 1];
        }
      } else {
        cursor.topics = this.mapEntities(topics);
        if (topics.length > 0) {
          startCursor = topics[0];
          endCursor = topics[topics.length - 1];
        }
      }

      // Create the cursor for the first item
      if (startCursor) {
        const previous = Buffer.from(JSON.stringify({ [sortBy]: startCursor[sortBy], _id: startCursor._id })).toString(
          'base64'
        );
        cursor.previous = previous;
      }

      // Create the cursor for the last item
      if (endCursor && hasNext) {
        const next = Buffer.from(JSON.stringify({ [sortBy]: endCursor[sortBy], _id: endCursor._id })).toString(
          'base64'
        );
        cursor.next = next;
      }
    }

    return cursor;
  }
}
