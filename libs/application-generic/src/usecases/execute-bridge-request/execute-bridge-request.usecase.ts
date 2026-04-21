import { BadRequestException, Injectable } from '@nestjs/common';
import { GetActionEnum, PostActionEnum } from '@novu/framework/internal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags/feature-flags.service';
import { ExecuteStepResolverRequest } from '../execute-step-resolver/execute-step-resolver-request.usecase';
import { ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from './execute-bridge-request.command';
import { ExecuteFrameworkRequest } from './execute-framework-request.usecase';

@Injectable()
export class ExecuteBridgeRequest {
  constructor(
    private frameworkRequest: ExecuteFrameworkRequest,
    private stepResolverRequest: ExecuteStepResolverRequest,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute<T extends PostActionEnum | GetActionEnum>(
    command: ExecuteBridgeRequestCommand
  ): Promise<ExecuteBridgeRequestDto<T>> {
    if (command.stepResolverHash) {
      const [isStepResolverEnabled, isActionStepResolverEnabled] = await Promise.all([
        this.featureFlagsService.getFlag({
          key: FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED,
          defaultValue: false,
          organization: { _id: command.organizationId },
        }),
        this.featureFlagsService.getFlag({
          key: FeatureFlagsKeysEnum.IS_ACTION_STEP_RESOLVER_ENABLED,
          defaultValue: false,
          organization: { _id: command.organizationId },
        }),
      ]);

      if (isStepResolverEnabled || isActionStepResolverEnabled) {
        if (![PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(command.action as PostActionEnum)) {
          throw new BadRequestException(
            `Step Resolver only supports EXECUTE and PREVIEW actions, got: ${command.action}`
          );
        }

        const result = await this.stepResolverRequest.execute(command);

        return result as ExecuteBridgeRequestDto<T>;
      }
    }

    return this.frameworkRequest.execute(command);
  }
}
