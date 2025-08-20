import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DeliveryLifecycleStatus } from '@novu/shared';
import { Trace, TraceLogRepository } from './analytic-logs/trace-log';
import { WorkflowRunService } from './workflow-run.service';

export interface MessageInteractionResult {
  success: boolean;
  processedTraceCount: number;
  error?: string;
}

export type MessageInteractionTrace = Omit<Trace, 'id' | 'expires_at'> & {
  _notificationId: string;
};

@Injectable()
export class MessageInteractionService {
  constructor(
    private traceLogRepository: TraceLogRepository,
    private workflowRunService: WorkflowRunService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async trace(interactionsTraces: MessageInteractionTrace[]): Promise<MessageInteractionResult> {
    try {
      if (interactionsTraces.length > 0) {
        await this.traceLogRepository.createStepRun(interactionsTraces.map(trace => ({
          organization_id: trace.organization_id,
          environment_id: trace.environment_id,
          user_id: trace.user_id,
          entity_id: trace.entity_id,
          event_type: trace.event_type,
          created_at: trace.created_at,
          external_subscriber_id: trace.external_subscriber_id,
          subscriber_id: trace.subscriber_id,
          title: trace.title,
          message: trace.message,
          step_run_type: trace.step_run_type,
          raw_data: trace.raw_data,
          status: trace.status,
          workflow_run_identifier: trace.workflow_run_identifier,
        } satisfies Omit<Trace, 'id' | 'expires_at' | 'entity_type'>)));
        
        this.logger.debug(
          {
            traceCount: interactionsTraces.length,
            organizationId: interactionsTraces[0]?.organization_id,
            environmentId: interactionsTraces[0]?.environment_id,
          },
          `Successfully logged ${interactionsTraces.length} message interaction traces`
        );

        await this.updateDeliveryLifecycle(interactionsTraces);
      }

      return {
        success: true,
        processedTraceCount: interactionsTraces.length,
      };
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          traceCount: interactionsTraces.length,
          organizationId: interactionsTraces[0]?.organization_id,
          environmentId: interactionsTraces[0]?.environment_id,
        },
        `Failed to process message interaction traces`
      );

      return {
        success: false,
        processedTraceCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async updateDeliveryLifecycle(traces: MessageInteractionTrace[]) {
    const tracesByNotificationId = traces.reduce<Record<string, MessageInteractionTrace[]>>((acc, trace) => {
      if (!acc[trace._notificationId]) acc[trace._notificationId] = [];
      acc[trace._notificationId].push(trace);
      return acc;
    }, {});


    for (const notificationId in tracesByNotificationId) {
      // for each workflow run, we need to update the delivery lifecycle as interacted, we do not care how exactly or how many times
      const trace = tracesByNotificationId[notificationId][0];
 
      await this.workflowRunService.updateDeliveryLifecycle({
        notificationId: trace._notificationId,
        environmentId: trace.environment_id,
        organizationId: trace.organization_id,
        subscriberId: trace.subscriber_id,
        deliveryLifecycleStatus: DeliveryLifecycleStatus.INTERACTED,
      });
    }
  }
}
