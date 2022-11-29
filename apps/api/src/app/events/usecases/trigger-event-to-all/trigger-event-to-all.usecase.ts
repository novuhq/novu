import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { TriggerEventCommand } from '../trigger-event/trigger-event.command';
import { TriggerEvent } from '../trigger-event/trigger-event.usecase';
import { TriggerEventToAllCommand } from './trigger-event-to-all.command';
import * as _ from 'lodash';

@Injectable()
export class TriggerEventToAll {
  constructor(private triggerEvent: TriggerEvent, private subscriberRepository: SubscriberRepository) {}

  public async execute(command: TriggerEventToAllCommand) {
    const batchSize = 500;
    let list = [];

    for await (const subscriber of this.subscriberRepository.findBatch(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      'subscriberId',
      {},
      batchSize
    ) as any) {
      list.push(subscriber);
      if (list.length === batchSize) {
        await this.trigger(command, list);
        list = [];
      }
    }

    if (list.length > 0) {
      await this.trigger(command, list);
    }

    return {
      acknowledged: true,
      status: 'processed',
      transactionId: command.transactionId,
    };
  }

  private async trigger(command: TriggerEventToAllCommand, list: SubscriberEntity[]) {
    await this.triggerEvent.execute(
      TriggerEventCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: command.identifier,
        payload: command.payload,
        to: list.map((item) => ({
          subscriberId: item.subscriberId,
        })),
        transactionId: command.transactionId,
        overrides: command.overrides,
        actor: command.actor,
      })
    );
  }
}
