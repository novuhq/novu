import { Injectable } from '@nestjs/common';
import { SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { ISubscribersDefine } from '@novu/shared';

import {
  CreateSubscriber,
  CreateSubscriberCommand,
} from '../create-subscriber';
import { InstrumentUsecase } from '../../instrumentation';
import { subscriberNeedUpdate } from '../../utils/subscriber';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { buildSubscriberKey, CachedEntity } from '../../services/cache';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: ProcessSubscriberCommand
  ): Promise<SubscriberEntity | undefined> {
    const { environmentId, organizationId, subscriber } = command;

    const subscriberEntity = await this.getSubscriber(
      environmentId,
      organizationId,
      subscriber
    );

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
    const subscriber = await this.getSubscriberBySubscriberId({
      _environmentId: environmentId,
      subscriberId: subscriberPayload.subscriberId,
    });

    if (subscriber && !subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(
      environmentId,
      organizationId,
      subscriberPayload,
      subscriber
    );
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
        data: subscriberPayload?.data,
      })
    );
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findBySubscriberId(
      _environmentId,
      subscriberId,
      true
    );
  }
}
