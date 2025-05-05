import { Injectable } from '@nestjs/common';
import { HealthCheck, GetActionEnum } from '@novu/framework/internal';
import { ExecuteBridgeRequest, ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from '@novu/application-generic';
import { WorkflowOriginEnum } from '@novu/shared';
import { GetBridgeStatusCommand } from './get-bridge-status.command';

export const LOG_CONTEXT = 'GetBridgeStatusUsecase';

@Injectable()
export class GetBridgeStatus {
  constructor(private executeBridgeRequest: ExecuteBridgeRequest) {}

  async execute(command: GetBridgeStatusCommand): Promise<HealthCheck> {
    return (await this.executeBridgeRequest.execute(
      ExecuteBridgeRequestCommand.create({
        environmentId: command.environmentId,
        action: GetActionEnum.HEALTH_CHECK,
        workflowOrigin: WorkflowOriginEnum.EXTERNAL,
        statelessBridgeUrl: command.statelessBridgeUrl,
        retriesLimit: 1,
      })
    )) as ExecuteBridgeRequestDto<GetActionEnum.HEALTH_CHECK>;
  }
}
