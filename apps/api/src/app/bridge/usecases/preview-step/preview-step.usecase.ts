import { Injectable } from '@nestjs/common';
import { PostActionEnum, HttpQueryKeysEnum, Event, JobStatusEnum, ExecuteOutput } from '@novu/framework';
import { ExecuteBridgeRequest, ExecuteBridgeRequestCommand } from '@novu/application-generic';
import { WorkflowOriginEnum } from '@novu/shared';

import { PreviewStepCommand } from './preview-step.command';

@Injectable()
export class PreviewStep {
  constructor(private executeBridgeRequest: ExecuteBridgeRequest) {}

  async execute(command: PreviewStepCommand): Promise<ExecuteOutput> {
    const event = this.mapEvent(command);

    const response = (await this.executeBridgeRequest.execute(
      ExecuteBridgeRequestCommand.create({
        environmentId: command.environmentId,
        action: PostActionEnum.PREVIEW,
        event,
        searchParams: {
          [HttpQueryKeysEnum.WORKFLOW_ID]: command.workflowId,
          [HttpQueryKeysEnum.STEP_ID]: command.stepId,
        },
        // TODO: pass the origin from the command
        workflowOrigin: WorkflowOriginEnum.EXTERNAL,
        retriesLimit: 1,
      })
    )) as ExecuteOutput;

    return response;
  }

  private mapEvent(command: PreviewStepCommand): Omit<Event, 'workflowId' | 'stepId' | 'action' | 'source'> {
    const payload = {
      /** @deprecated - use controls instead */
      inputs: command.controls || {},
      controls: command.controls || {},
      /** @deprecated - use payload instead */
      data: command.payload || {},
      payload: command.payload || {},
      state: [
        {
          stepId: 'trigger',
          outputs: command.payload || {},
          state: { status: JobStatusEnum.COMPLETED },
        },
      ],
      subscriber: {},
    };

    return payload;
  }
}
