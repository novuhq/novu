import { Injectable } from '@nestjs/common';
import { AddressingTypeEnum, TriggerRequestCategoryEnum } from '@novu/shared';
import { ParseEventRequest, ParseEventRequestBroadcastCommand } from '../parse-event-request';
import { TriggerEventToAllCommand } from './trigger-event-to-all.command';

@Injectable()
export class TriggerEventToAll {
  constructor(private parseEventRequest: ParseEventRequest) {}

  public async execute(command: TriggerEventToAllCommand) {
    const result = await this.parseEventRequest.execute(
      ParseEventRequestBroadcastCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: command.identifier,
        payload: command.payload || {},
        addressingType: AddressingTypeEnum.BROADCAST,
        transactionId: command.transactionId,
        overrides: command.overrides || {},
        actor: command.actor,
        tenant: command.tenant,
        context: command.context,
        requestCategory: TriggerRequestCategoryEnum.SINGLE,
        bridgeUrl: command.bridgeUrl,
        requestId: command.requestId,
      })
    );

    return {
      acknowledged: result.acknowledged,
      status: result.status,
      transactionId: result.transactionId,
      activityFeedLink: result.activityFeedLink,
    };
  }
}
