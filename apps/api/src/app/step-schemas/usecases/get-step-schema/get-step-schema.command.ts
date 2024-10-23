import { BadRequestException } from '@nestjs/common';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ActionStepEnum, ChannelStepEnum, StepType } from '@novu/framework/internal';
import { UserSessionData } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

const StepTypeValue = { ...ChannelStepEnum, ...ActionStepEnum };

export class GetStepTypeSchemaCommand extends EnvironmentWithUserCommand {
  @IsEnum(StepTypeValue)
  @IsNotEmpty()
  stepType: StepType;
}

export class GetExistingStepSchemaCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsNotEmpty()
  stepId: string;
}

export type GetStepSchemaCommand = GetStepTypeSchemaCommand | GetExistingStepSchemaCommand;

export function createGetStepSchemaCommand(
  user: UserSessionData,
  stepType?: StepType,
  workflowId?: string,
  stepId?: string
): GetExistingStepSchemaCommand | GetStepTypeSchemaCommand {
  if (workflowId && stepId) {
    return GetExistingStepSchemaCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      userId: user._id,
      workflowId,
      stepId,
    });
  }

  if (stepType) {
    return GetStepTypeSchemaCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      userId: user._id,
      stepType,
    });
  }

  throw new BadRequestException('Invalid command, either workflowId and stepId or stepType is required');
}
