import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
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

  async trace(traces: MessageInteractionTrace[]): Promise<MessageInteractionResult> {
    try {
      if (traces.length > 0) {
        await this.traceLogRepository.createStepRun(traces);
        
        this.logger.debug(
          {
            traceCount: traces.length,
            organizationId: traces[0]?.organization_id,
            environmentId: traces[0]?.environment_id,
          },
          `Successfully logged ${traces.length} message interaction traces`
        );

        await this.updateDeliveryLifecycle(traces);
      }

      return {
        success: true,
        processedTraceCount: traces.length,
      };
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          traceCount: traces.length,
          organizationId: traces[0]?.organization_id,
          environmentId: traces[0]?.environment_id,
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
      });
    }
  }
}
