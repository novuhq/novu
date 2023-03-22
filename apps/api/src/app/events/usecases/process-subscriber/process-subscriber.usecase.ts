import { Injectable } from '@nestjs/common';
import { SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { ISubscribersDefine } from '@novu/shared';

import { ProcessSubscriberCommand } from './process-subscriber.command';

import { subscriberNeedUpdate } from '../../../subscribers/usecases/update-subscriber';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';

@Injectable()
export class ProcessSubscriber {
  constructor(private createSubscriberUsecase: CreateSubscriber, private subscriberRepository: SubscriberRepository) {}

  public async execute(command: ProcessSubscriberCommand): Promise<SubscriberEntity | undefined> {
    const { environmentId, organizationId, subscriber } = command;

    const subscriberEntity = await this.getSubscriber(environmentId, organizationId, subscriber);

    if (subscriberEntity === null) {
      return undefined;
    }

    return subscriberEntity;
  }

  private async getSubscriber(
    environmentId: string,
    organizationId: string,
    subscriberPayload: ISubscribersDefine
  ): Promise<SubscriberEntity> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      environmentId,
      subscriberPayload.subscriberId
    );

    if (subscriber && !subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(environmentId, organizationId, subscriberPayload, subscriber);
  }

  private async createOrUpdateSubscriber(
    environmentId: string,
    organizationId: string,
    subscriberPayload,
    // TODO: Getting rid of this null would be amazing
    subscriber?: SubscriberEntity | null
  ): Promise<SubscriberEntity> {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId,
        organizationId,
        subscriberId: subscriberPayload?.subscriberId,
        email: subscriberPayload?.email,
        firstName: subscriberPayload?.firstName,
        lastName: subscriberPayload?.lastName,
        phone: subscriberPayload?.phone,
        avatar: subscriberPayload?.avatar,
        locale: subscriberPayload?.locale,
        subscriber: subscriber ?? undefined,
      })
    );
  }
}
