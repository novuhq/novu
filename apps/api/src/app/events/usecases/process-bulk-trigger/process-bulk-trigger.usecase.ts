import { Injectable } from '@nestjs/common';
import { IWorkflowBulkJobDto, WorkflowQueueService } from '@novu/application-generic';
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
    private notificationTemplateRepository: NotificationTemplateRepository,
    private workflowQueueService: WorkflowQueueService
  ) {}

  async execute(command: ProcessBulkTriggerCommand) {
    // Extract unique workflow identifiers from all events
    const uniqueWorkflowIdentifiers = [...new Set(command.events.map((event) => event.name))];

    // Fetch all unique workflows in a single batch operation with specific fields
    const workflows = await this.notificationTemplateRepository.find(
      {
        _environmentId: command.environmentId,
        'triggers.identifier': { $in: uniqueWorkflowIdentifiers },
      },
      '_id active payloadSchema validatePayload triggers',
      { readPreference: 'secondaryPreferred' }
    );

    // Create a map for quick lookup
    const workflowMap = new Map();
    for (const workflow of workflows) {
      const triggerIdentifier = workflow.triggers[0]?.identifier;
      if (triggerIdentifier) {
        workflowMap.set(triggerIdentifier, workflow);
      }
    }

    const processBatch = async (batch: typeof command.events) => {
      return Promise.all(
        batch.map(async (event) => {
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
                context: event.context,
                transactionId: event.transactionId,
                addressingType: AddressingTypeEnum.MULTICAST,
                requestCategory: TriggerRequestCategoryEnum.BULK,
                bridgeUrl: event.bridgeUrl,
                requestId: command.requestId,
                workflow,
                skipQueueInsertion: true,
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
              transactionId: event.transactionId,
            } as TriggerEventResponseDto;
          }
        })
      );
    };

    const BATCH_SIZE = 5;
    const results: TriggerEventResponseDto[] = [];

    for (let i = 0; i < command.events.length; i += BATCH_SIZE) {
      const batch = command.events.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    }

    const jobsToQueue: IWorkflowBulkJobDto[] = results
      .filter(
        (result): result is TriggerEventResponseDto & { jobData: NonNullable<typeof result.jobData> } =>
          result.status === TriggerEventStatusEnum.PROCESSED && result.jobData !== undefined
      )
      .map((result) => ({
        name: result.jobData.transactionId,
        data: result.jobData,
        groupId: result.jobData.organizationId,
      }));

    if (jobsToQueue.length > 0) {
      await this.workflowQueueService.addBulk(jobsToQueue);
    }

    return results.map(({ jobData, ...rest }) => rest);
  }
}
