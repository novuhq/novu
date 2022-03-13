import { BaseRepository } from '../base-repository';
import { SubscriberEntity } from './subscriber.entity';
import { Subscriber } from './subscriber.schema';

export class SubscriberRepository extends BaseRepository<SubscriberEntity> {
  constructor() {
    super(Subscriber, SubscriberEntity);
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
}

function regExpEscape(literalString) {
  return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}
