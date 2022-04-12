import { Injectable } from '@nestjs/common';
import { SubscriberRepository, DalException } from '@novu/dal';
import { RemoveSubscriberCommand } from './remove-subscriber.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class RemoveSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: RemoveSubscriberCommand) {
    try {
      await this.subscriberRepository.delete({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
