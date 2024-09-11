import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ActionStepEnum, ChannelStepEnum, StepType } from '@novu/framework';
import { IsEnum } from 'class-validator';

const StepTypeValue = { ...ChannelStepEnum, ...ActionStepEnum };

export class GetControlSchemaCommand extends EnvironmentWithUserCommand {
  @IsEnum(StepTypeValue)
  stepType: StepType;
}
