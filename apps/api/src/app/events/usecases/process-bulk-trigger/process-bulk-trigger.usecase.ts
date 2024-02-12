import { Injectable } from '@nestjs/common';
import { AddressingTypeEnum, TriggerEventStatusEnum, TriggerRequestCategoryEnum } from '@novu/shared';

import { ProcessBulkTriggerCommand } from './process-bulk-trigger.command';

import { TriggerEventResponseDto } from '../../dtos';
import { ParseEventRequest } from '../parse-event-request/parse-event-request.usecase';
import { ParseEventRequestMulticastCommand } from '../parse-event-request/parse-event-request.command';

@Injectable()
export class ProcessBulkTrigger {
  constructor(private parseEventRequest: ParseEventRequest) {}

  async execute(command: ProcessBulkTriggerCommand) {
    const results: TriggerEventResponseDto[] = [];

    for (const event of command.events) {
      let result: TriggerEventResponseDto;

      try {
        result = (await this.parseEventRequest.execute(
          ParseEventRequestMulticastCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            identifier: event.name,
            payload: event.payload,
            overrides: event.overrides || {},
            to: event.to,
            actor: event.actor,
            tenant: event.tenant,
            transactionId: event.transactionId,
            addressingType: AddressingTypeEnum.MULTICAST,
            requestCategory: TriggerRequestCategoryEnum.BULK,
          })
        )) as unknown as TriggerEventResponseDto;
      } catch (e) {
        let error: string[];
        if (e.response?.message) {
          error = Array.isArray(e.response?.message) ? e.response?.message : [e.response?.message];
        } else {
          error = [e.message];
        }

        result = {
          acknowledged: true,
          status: TriggerEventStatusEnum.ERROR,
          error,
        };
      }

      results.push(result);
    }

    return results;
  }
}
