import { FilterQuery } from 'mongoose';
import { DirectionEnum, EnvironmentId, ISubscribersDefine, OrganizationId, SubscriberDto } from '@novu/shared';
import { SubscriberDBModel, SubscriberEntity } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';
import { IExternalSubscribersEntity } from './types';
import { BaseRepository } from '../base-repository';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BulkCreateSubscriberEntity } from './bulk.create.subscriber.entity';

export class SubscriberRepository extends BaseRepository<SubscriberDBModel, SubscriberEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Subscriber, SubscriberEntity);
  }

  async findBySubscriberId(
    environmentId: string,
    subscriberId: string,
    secondaryRead = false
  ): Promise<SubscriberEntity | null> {
    return await this.findOne(
      {
        _environmentId: environmentId,
        subscriberId,
      },
      undefined,
      { readPreference: secondaryRead ? 'secondaryPreferred' : 'primary' }
    );
  }

  async bulkCreateSubscribers(
    subscribers: ISubscribersDefine[],
    environmentId: EnvironmentId,
    organizationId: OrganizationId
  ): Promise<BulkCreateSubscriberEntity> {
    const bulkWriteOps = subscribers.map((subscriber) => {
      const { subscriberId, ...rest } = subscriber;

      return {
        updateOne: {
          filter: { subscriberId, _environmentId: environmentId, _organizationId: organizationId },
          update: { $set: { ...rest, deleted: false } },
          upsert: true,
        },
      };
    });

    let bulkResponse;
    try {
      bulkResponse = await this.bulkWrite(bulkWriteOps);
    } catch (e: unknown) {
      if (isErrorWithWriteErrors(e)) {
        if (!e.writeErrors) {
          throw new DalException(e.message);
        }
        bulkResponse = e.result;
      } else {
        throw new DalException('An unknown error occurred');
      }
    }
    const created = bulkResponse.getUpsertedIds();
    const writeErrors = bulkResponse.getWriteErrors();

    const indexes: number[] = [];

    const insertedSubscribers = created.map((inserted) => {
      indexes.push(inserted.index);

      return mapToSubscriberObject(subscribers[inserted.index]?.subscriberId);
    });

    let failed = [];
    if (writeErrors.length > 0) {
      failed = writeErrors.map((error) => {
        indexes.push(error.err.index);

        return {
          message: error.err.errmsg,
          subscriberId: error.err.op?.subscriberId,
        };
      });
    }

    const updatedSubscribers = subscribers
      .filter((subId, index) => !indexes.includes(index))
      .map((subscriber) => {
        return mapToSubscriberObject(subscriber.subscriberId);
      });

    return {
      updated: updatedSubscribers,
      created: insertedSubscribers,
      failed,
    };
  }

  async searchByExternalSubscriberIds(
    externalSubscribersEntity: IExternalSubscribersEntity
  ): Promise<SubscriberEntity[]> {
    const { _environmentId, _organizationId, externalSubscriberIds } = externalSubscribersEntity;

    return this.find({
      _environmentId,
      _organizationId,
      subscriberId: {
        $in: externalSubscriberIds,
      },
    });
  }

  async searchSubscribers(
    environmentId: string,
    subscriberIds: string[] = [],
    emails: string[] = [],
    search?: string
  ): Promise<string[]> {
    const filters: any = [];

    if (emails?.length) {
      filters.push({
        email: {
          $in: emails,
        },
      });
    }

    if (subscriberIds?.length) {
      filters.push({
        subscriberId: {
          $in: subscriberIds,
        },
      });
    }

    if (search) {
      filters.push(
        {
          email: {
            $regex: regExpEscape(search),
            $options: 'i',
          },
        },
        {
          subscriberId: { $eq: search },
        }
      );
    }

    return (
      await this.find(
        {
          _environmentId: environmentId,
          $or: filters,
        },
        '_id'
      )
    ).map((entity) => entity._id);
  }

  async estimatedDocumentCount(): Promise<number> {
    return this._model.estimatedDocumentCount();
  }

  async listSubscribers(query: {
    environmentId: string;
    organizationId: string;
    limit: number;
    sortBy: 'updatedAt' | '_id';
    sortDirection: DirectionEnum;
    after?: string;
    before?: string;
    email?: string;
    phone?: string;
    subscriberId?: string;
    name?: string;
  }): Promise<{ subscribers: SubscriberEntity[]; next: string | null; previous: string | null }> {
    if (query.before && query.after) {
      throw new DalException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const id = query.before || query.after;
    let subscriber: SubscriberEntity | null = null;
    if (id) {
      subscriber = await this.findOne({
        _environmentId: query.environmentId,
        _organizationId: query.organizationId,
        _id: id,
      });
      if (!subscriber) {
        return {
          subscribers: [],
          next: null,
          previous: null,
        };
      }
    }

    const after =
      query.after && subscriber ? { sortBy: subscriber[query.sortBy], paginateField: subscriber._id } : undefined;
    const before =
      query.before && subscriber ? { sortBy: subscriber[query.sortBy], paginateField: subscriber._id } : undefined;

    const pagination = await this.findWithCursorBasedPagination({
      after,
      before,
      paginateField: '_id',
      limit: query.limit,
      sortDirection: query.sortDirection,
      sortBy: query.sortBy,
      query: {
        _environmentId: query.environmentId,
        _organizationId: query.organizationId,
        $and: [
          {
            ...(query.email && { email: query.email }),
            ...(query.phone && { phone: query.phone }),
            ...(query.subscriberId && { subscriberId: query.subscriberId }),
            ...(query.name && {
              $expr: {
                $eq: [
                  {
                    $trim: {
                      input: {
                        $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }],
                      },
                    },
                  },
                  query.name,
                ],
              },
            }),
          },
        ],
      },
    });

    return {
      subscribers: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
    };
  }
}

function mapToSubscriberObject(subscriberId: string) {
  return { subscriberId };
}

function regExpEscape(literalString: string): string {
  return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}

function isErrorWithWriteErrors(e: unknown): e is { writeErrors?: any; message?: string; result?: any } {
  return typeof e === 'object' && e !== null && 'writeErrors' in e;
}
