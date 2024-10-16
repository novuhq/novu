import { Injectable } from '@nestjs/common/decorators';
import { Event, ExecuteOutput, HttpQueryKeysEnum, JobStatusEnum, PostActionEnum } from '@novu/framework';
import { ExecuteBridgeRequest, ExecuteBridgeRequestCommand } from '@novu/application-generic';
import { WorkflowOriginEnum } from '@novu/shared';

import { PreviewStepCommand } from './preview-step.command';

@Injectable()
export class PreviewStep {
  constructor(private executeBridgeRequest: ExecuteBridgeRequest) {}

  async execute(command: PreviewStepCommand): Promise<ExecuteOutput> {
    const event = this.buildBridgeEventPayload(command);
    const executeCommand = this.createExecuteCommand(command, event);

    const bridgeResult = await this.executeBridgeRequest.execute(executeCommand);

    return bridgeResult as ExecuteOutput;
  }

  private createExecuteCommand(command: PreviewStepCommand, event: Event) {
    return ExecuteBridgeRequestCommand.create({
      environmentId: command.environmentId,
      action: PostActionEnum.PREVIEW,
      event,
      searchParams: {
        [HttpQueryKeysEnum.WORKFLOW_ID]: command.workflowId,
        [HttpQueryKeysEnum.STEP_ID]: command.stepId,
      },
      // TODO: pass the origin from the command
      workflowOrigin: WorkflowOriginEnum.NOVU_CLOUD,
      retriesLimit: 1,
    });
  }

  private buildBridgeEventPayload(command: PreviewStepCommand): Event {
    return {
      inputs: {}, // @deprecated - use controls instead
      controls: command.controls || {},

      data: {}, // @deprecated - use payload instead
      payload: command.payload || {},
      state: [
        {
          stepId: 'trigger',
          outputs: command.payload || {},
          state: { status: JobStatusEnum.COMPLETED },
        },
      ],
      subscriber: command.subscriber || {},
      stepId: command.stepId,
      workflowId: command.workflowId,
      action: PostActionEnum.PREVIEW,
    };
  }
}
