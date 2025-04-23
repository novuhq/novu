import { Injectable } from '@nestjs/common';
import { Event, ExecuteOutput, HttpQueryKeysEnum, PostActionEnum } from '@novu/framework/internal';
import { ExecuteBridgeRequest, ExecuteBridgeRequestCommand, InstrumentUsecase } from '@novu/application-generic';

import { PreviewStepCommand } from './preview-step.command';
import { Subscriber } from '../../../inbox/utils/types';
import { SubscriberResponseDto } from '../../../subscribers/dtos';

@Injectable()
export class PreviewStep {
  constructor(private executeBridgeRequest: ExecuteBridgeRequest) {}

  @InstrumentUsecase()
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
      workflowOrigin: command.workflowOrigin,
      retriesLimit: 1,
    });
  }

  private buildBridgeEventPayload(command: PreviewStepCommand): Event {
    return {
      controls: command.controls || {},
      payload: command.payload || {},
      state: command.state || [],
      subscriber: this.mapSubscriberResponseToSubscriber(command.subscriber),
      stepId: command.stepId,
      workflowId: command.workflowId,
      action: PostActionEnum.PREVIEW,
    };
  }

  private mapSubscriberResponseToSubscriber(
    subscriberResponse?: Partial<SubscriberResponseDto> | undefined
  ): Subscriber {
    if (!subscriberResponse) {
      return {
        id: '',
        subscriberId: '',
      };
    }

    return {
      id: subscriberResponse._id || '',
      firstName: subscriberResponse.firstName,
      lastName: subscriberResponse.lastName,
      avatar: subscriberResponse.avatar,
      subscriberId: subscriberResponse.subscriberId || '',
    };
  }
}
