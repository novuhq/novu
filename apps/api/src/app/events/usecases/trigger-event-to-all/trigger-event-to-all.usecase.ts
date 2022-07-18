import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { ISubscribersDefine } from '@novu/node';
import { TriggerEventCommand } from '../trigger-event/trigger-event.command';
import { TriggerEvent } from '../trigger-event/trigger-event.usecase';
import { TriggerEventToAllCommand } from './trigger-event-to-all.command';

@Injectable()
export class TriggerEventToAll {
  constructor(private triggerEvent: TriggerEvent, private subscriberRepository: SubscriberRepository) {}

  public async execute(command: TriggerEventToAllCommand) {
    const subscribers = await this.subscriberRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      'subscriberId'
    );

    return this.triggerEvent.execute(
      TriggerEventCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: command.identifier,
        payload: command.payload,
        to: subscribers.map(
          (subscriber): ISubscribersDefine => ({
            subscriberId: subscriber.subscriberId,
          })
        ),
        transactionId: command.transactionId,
      })
    );
  }
}
