import { Injectable } from '@nestjs/common';
import { TriggerEventStatusEnum } from '@novu/shared';
import { MapTriggerRecipients } from '@novu/application-generic';

import { ProcessBulkTriggerCommand } from './process-bulk-trigger.command';

import { TriggerEventResponseDto } from '../../dtos';
import { ParseEventRequestCommand } from '../parse-event-request/parse-event-request.command';
import { ParseEventRequest } from '../parse-event-request/parse-event-request.usecase';

@Injectable()
export class ProcessBulkTrigger {
  constructor(private parseEventRequest: ParseEventRequest, private mapTriggerRecipients: MapTriggerRecipients) {}

  async execute(command: ProcessBulkTriggerCommand) {
    const results: TriggerEventResponseDto[] = [];

    for (const event of command.events) {
      let result: TriggerEventResponseDto;
      const mappedTenant = event.tenant ? this.parseEventRequest.mapTenant(event.tenant) : null;

      try {
        result = (await this.parseEventRequest.execute(
          ParseEventRequestCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            identifier: event.name,
            payload: event.payload,
            overrides: event.overrides || {},
            to: event.to,
            actor: event.actor,
            tenant: mappedTenant,
            transactionId: event.transactionId,
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
