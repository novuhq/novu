import { SoftDeleteModel } from 'mongoose-delete';
import { FilterQuery } from 'mongoose';

import { SubscriberEntity, SubscriberDBModel } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';
import { IExternalSubscribersEntity } from './types';
import { BaseRepository } from '../base-repository';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

type SubscriberQuery = FilterQuery<SubscriberDBModel> & EnforceEnvOrOrgIds;

export class SubscriberRepository extends BaseRepository<SubscriberDBModel, SubscriberEntity, EnforceEnvOrOrgIds> {
  private subscriber: SoftDeleteModel;
  constructor() {
    super(Subscriber, SubscriberEntity);
    this.subscriber = Subscriber;
  }

  async createSubscriber(
    entity: Omit<SubscriberEntity, '_id' | 'subscriberId' | 'deleted' | 'createdAt' | 'updatedAt'>
  ): Promise<SubscriberEntity> {
    const { _environmentId, _organizationId, channels, email, firstName, lastName, phone } = entity;

    return await this.create({
      channels,
      ...(email && { email }),
      firstName,
      lastName,
      ...(phone && { phone }),
      subscriberId: SubscriberRepository.createObjectId(),
      // TODO: review somehow the environmentId needs to be converted to ObjectId but organizationId not
      _environmentId: this.convertStringToObjectId(_environmentId),
      _organizationId,
    });
  }

  async findBySubscriberId(environmentId: string, subscriberId: string): Promise<SubscriberEntity | null> {
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

  async searchSubscribers(environmentId: string, search?: string | null, emails: string[] | null = []) {
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

  async delete(query: SubscriberQuery) {
    const foundSubscriber = await this.findOne({
      _environmentId: query._environmentId,
      subscriberId: query.subscriberId,
    });

    if (!foundSubscriber) {
      throw new DalException(`Could not find subscriber ${query.subscriberId} to delete`);
    }

    const requestQuery: SubscriberQuery = {
      _environmentId: foundSubscriber._environmentId,
      subscriberId: foundSubscriber.subscriberId,
    };

    await this.subscriber.delete(requestQuery);
  }

  async findDeleted(query: SubscriberQuery) {
    const requestQuery: SubscriberQuery = {
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
