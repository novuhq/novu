import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository } from '../base-repository';
import { SubscriberEntity } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';
import { DalException } from '../../shared';
import { Document, FilterQuery } from 'mongoose';

export class SubscriberRepository extends BaseRepository<SubscriberEntity> {
  private subscriber: SoftDeleteModel;
  constructor() {
    super(Subscriber, SubscriberEntity);
    this.subscriber = Subscriber;
  }

  async findBySubscriberId(applicationId: string, subscriberId: string) {
    return await this.findOne({
      _applicationId: applicationId,
      subscriberId,
    });
  }

  async searchSubscriber(applicationId: string, search: string) {
    return await this.findOne({
      _applicationId: applicationId,
      $or: [
        {
          email: {
            $regex: regExpEscape(search),
            $options: 'i',
          },
        },
        {
          subscriberId: search,
        },
      ],
    });
  }

  async delete(query: FilterQuery<SubscriberEntity & Document>) {
    const foundSubscriber = await this.findOne({
      _applicationId: query.applicationId,
      subscriberId: query.subscriberId,
    });
    if (!foundSubscriber) {
      throw new DalException(`Could not find subscriber with id ${foundSubscriber.subscriberId} to delete`);
    }
    await this.subscriber.delete({
      _applicationId: foundSubscriber._applicationId,
      subscriberId: foundSubscriber.subscriberId,
    });
  }

  async findDeleted(query: FilterQuery<SubscriberEntity & Document>) {
    const res = await this.subscriber.findDeleted({
      _applicationId: query.applicationId,
      subscriberId: query.subscriberId,
    });

    return this.mapEntity(res);
  }
}

function regExpEscape(literalString) {
  return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}
