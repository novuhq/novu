import { BadRequestException, Injectable } from '@nestjs/common';
import { GetActionEnum, PostActionEnum } from '@novu/framework/internal';
import { InstrumentUsecase } from '../../instrumentation';
import { ExecuteStepResolverRequest } from '../execute-step-resolver/execute-step-resolver-request.usecase';
import { ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from './execute-bridge-request.command';
import { ExecuteFrameworkRequest } from './execute-framework-request.usecase';

@Injectable()
export class ExecuteBridgeRequest {
  constructor(
    private frameworkRequest: ExecuteFrameworkRequest,
    private stepResolverRequest: ExecuteStepResolverRequest
  ) {}

  @InstrumentUsecase()
  async execute<T extends PostActionEnum | GetActionEnum>(
    command: ExecuteBridgeRequestCommand
  ): Promise<ExecuteBridgeRequestDto<T>> {
    if (command.stepResolverHash) {
      if (![PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(command.action as PostActionEnum)) {
        throw new BadRequestException(
          `Step Resolver only supports EXECUTE and PREVIEW actions, got: ${command.action}`
        );
      }

      return this.stepResolverRequest.execute(command) as Promise<ExecuteBridgeRequestDto<T>>;
    }

    return this.frameworkRequest.execute(command);
  }
}
