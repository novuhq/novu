import { Injectable } from '@nestjs/common';
import { Event, ExecuteOutput, HttpQueryKeysEnum, PostActionEnum } from '@novu/framework/internal';
import { InstrumentUsecase } from '../../instrumentation';
import { ExecuteBridgeRequest, ExecuteBridgeRequestCommand } from '../execute-bridge-request';
import { PreviewStepCommand } from './preview-step.command';

@Injectable()
export class PreviewStep {
  constructor(private executeBridgeRequest: ExecuteBridgeRequest) {}

  @InstrumentUsecase()
  async execute(command: PreviewStepCommand): Promise<ExecuteOutput> {
    const stepResolverHash = command.stepResolverHash;

    const event = this.buildBridgeEventPayload(command);

    const bridgeResult = await this.executeBridgeRequest.execute(
      ExecuteBridgeRequestCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        action: PostActionEnum.PREVIEW,
        event,
        searchParams: {
          [HttpQueryKeysEnum.WORKFLOW_ID]: command.workflowId,
          [HttpQueryKeysEnum.STEP_ID]: command.stepId,
          layoutId: command.layoutId,
          skipLayoutRendering: command.skipLayoutRendering ? 'true' : 'false',
        },
        workflowOrigin: command.workflowOrigin,
        stepResolverHash,
        retriesLimit: 1,
      })
    );

    return bridgeResult as ExecuteOutput;
  }

  private buildBridgeEventPayload(command: PreviewStepCommand): Event {
    const env = command.env ?? {};

    return {
      controls: command.controls || {},
      payload: command.payload || {},
      state: command.state || [],
      subscriber: command.subscriber || {},
      context: command.context || {},
      stepId: command.stepId,
      workflowId: command.workflowId,
      action: PostActionEnum.PREVIEW,
      env: {
        ...env,
        name: env.name ?? '',
        type: env.type === 'prod' ? 'prod' : 'dev',
      },
    };
  }
}
