import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository, Omit } from '../base-repository';
import { SubscriberEntity } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';
import { Cached, DalException, ICacheService, InvalidateCache } from '../../shared';
import { Document, FilterQuery, ProjectionType } from 'mongoose';

class PartialSubscriberEntity extends Omit(SubscriberEntity, ['_environmentId', '_organizationId']) {}

type EnforceIdentifierQuery = FilterQuery<PartialSubscriberEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

type EnforceEnvironmentQuery = FilterQuery<PartialSubscriberEntity & Document> & { _environmentId: string } & {
  _id: string;
};

export class SubscriberRepository extends BaseRepository<EnforceIdentifierQuery, SubscriberEntity> {
  private subscriber: SoftDeleteModel;
  constructor(cacheService?: ICacheService) {
    super(Subscriber, SubscriberEntity, cacheService);
    this.subscriber = Subscriber;
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

  @InvalidateCache()
  async create(data: EnforceIdentifierQuery) {
    return super.create(data);
  }

  @Cached()
  async findOne(query: EnforceEnvironmentQuery, select?: ProjectionType<any>) {
    return super.findOne(query, select);
  }

  async findBySubscriberId(environmentId: string, subscriberId: string): Promise<SubscriberEntity> {
    return await super.findOne({
      _environmentId: environmentId,
      subscriberId,
    } as EnforceEnvironmentQuery);
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

  async delete(query: EnforceIdentifierQuery) {
    const foundSubscriber = await this.findOne({
      _environmentId: query._environmentId,
      subscriberId: query.subscriberId,
    } as EnforceEnvironmentQuery);

    if (!foundSubscriber) {
      throw new DalException(`Could not find subscriber ${query.subscriberId} to delete`);
    }

    if (this.cacheService?.cacheEnabled()) {
      this.cacheService.delByPattern(`Subscriber*${foundSubscriber._id}:${foundSubscriber._environmentId}`);
    }

    const requestQuery: EnforceIdentifierQuery = {
      _environmentId: foundSubscriber._environmentId,
      subscriberId: foundSubscriber.subscriberId,
    };

    await this.subscriber.delete(requestQuery);
  }

  async findDeleted(query: EnforceIdentifierQuery) {
    const requestQuery: EnforceIdentifierQuery = {
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
