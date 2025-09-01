import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { AddressingTypeEnum, TriggerEventStatusEnum, TriggerRequestCategoryEnum } from '@novu/shared';
import { TriggerEventResponseDto } from '../../dtos';
import { ParseEventRequestMulticastCommand } from '../parse-event-request/parse-event-request.command';
import { ParseEventRequest } from '../parse-event-request/parse-event-request.usecase';
import { ProcessBulkTriggerCommand } from './process-bulk-trigger.command';

@Injectable()
export class ProcessBulkTrigger {
  constructor(
    private parseEventRequest: ParseEventRequest,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  async execute(command: ProcessBulkTriggerCommand) {
    // Extract unique workflow identifiers from all events
    const uniqueWorkflowIdentifiers = [...new Set(command.events.map((event) => event.name))];

    // Fetch all unique workflows in a single batch operation
    const workflows = await this.notificationTemplateRepository.findByTriggerIdentifierBulk(
      command.environmentId,
      uniqueWorkflowIdentifiers
    );

    // Create a map for quick lookup
    const workflowMap = new Map();
    for (const workflow of workflows) {
      const triggerIdentifier = workflow.triggers[0]?.identifier;
      if (triggerIdentifier) {
        workflowMap.set(triggerIdentifier, workflow);
      }
    }

    const eventPromises = command.events.map(async (event) => {
      try {
        const workflow = workflowMap.get(event.name);

        const result = (await this.parseEventRequest.execute(
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
            bridgeUrl: event.bridgeUrl,
            requestId: command.requestId,
            workflow,
          })
        )) as unknown as TriggerEventResponseDto;

        return result;
      } catch (e) {
        let error: string[];
        if (e.response?.message) {
          error = Array.isArray(e.response?.message) ? e.response?.message : [e.response?.message];
        } else {
          error = [e.message];
        }

        return {
          acknowledged: true,
          status: TriggerEventStatusEnum.ERROR,
          error,
        } as TriggerEventResponseDto;
      }
    });

    const results = await Promise.all(eventPromises);

    return results;
  }
}
