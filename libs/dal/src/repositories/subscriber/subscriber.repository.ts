import { SoftDeleteModel } from 'mongoose-delete';
import { Document, FilterQuery } from 'mongoose';

import { SubscriberEntity } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';
import { IExternalSubscribersEntity } from './types';

import { BaseRepository, Omit } from '../base-repository';
import { DalException } from '../../shared';

class PartialSubscriberEntity extends Omit(SubscriberEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialSubscriberEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class SubscriberRepository extends BaseRepository<EnforceEnvironmentQuery, SubscriberEntity> {
  private subscriber: SoftDeleteModel;
  constructor() {
    super(Subscriber, SubscriberEntity);
    this.subscriber = Subscriber;
  }

  async findBySubscriberId(environmentId: string, subscriberId: string): Promise<SubscriberEntity> {
    return await this.findOne({
      _environmentId: environmentId,
      subscriberId,
    });
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

  async searchSubscribers(environmentId: string, search: string, emails: string[] = []) {
    const filters: any = [
      {
        email: {
          $in: emails,
        },
      },
    ];

    if (search) {
      filters.push(
        {
          email: {
            $regex: regExpEscape(search),
            $options: 'i',
          },
        },
        {
          subscriberId: search,
        }
      );
    }

    return await this.find({
      _environmentId: environmentId,
      $or: filters,
    });
  }

  async delete(query: EnforceEnvironmentQuery) {
    const foundSubscriber = await this.findOne({
      _environmentId: query._environmentId,
      subscriberId: query.subscriberId,
    });

    if (!foundSubscriber) {
      throw new DalException(`Could not find subscriber ${query.subscriberId} to delete`);
    }

    const requestQuery: EnforceEnvironmentQuery = {
      _environmentId: foundSubscriber._environmentId,
      subscriberId: foundSubscriber.subscriberId,
    };

    await this.subscriber.delete(requestQuery);
  }

  async findDeleted(query: EnforceEnvironmentQuery) {
    const requestQuery: EnforceEnvironmentQuery = {
      _environmentId: query._environmentId,
      subscriberId: query.subscriberId,
    };

    const res = await this.subscriber.findDeleted(requestQuery);

    return this.mapEntity(res);
  }
}

function regExpEscape(literalString: string): string {
  return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}
