import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { TriggerEventStatusEnum } from '@novu/shared';

import { TriggerEventToAllCommand } from './trigger-event-to-all.command';
import { ParseEventRequest, ParseEventRequestCommand } from '../parse-event-request';

@Injectable()
export class TriggerEventToAll {
  constructor(private subscriberRepository: SubscriberRepository, private parseEventRequest: ParseEventRequest) {}

  public async execute(command: TriggerEventToAllCommand) {
    const batchSize = 500;
    let list: SubscriberEntity[] = [];

    for await (const subscriber of this.subscriberRepository.findBatch(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      'subscriberId',
      {},
      batchSize
    )) {
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
      status: TriggerEventStatusEnum.PROCESSED,
      transactionId: command.transactionId,
    };
  }

  private async trigger(command: TriggerEventToAllCommand, list: SubscriberEntity[]) {
    await this.parseEventRequest.execute(
      ParseEventRequestCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: command.identifier,
        payload: command.payload || {},
        to: list.map((item) => ({
          subscriberId: item.subscriberId,
        })),
        transactionId: command.transactionId,
        overrides: command.overrides || {},
        actor: command.actor,
        tenant: command.tenant,
      })
    );
  }
}
