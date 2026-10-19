import { StepTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';

export class DisconnectStepResolverCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  stepInternalId: string;

  @IsEnum(StepTypeEnum)
  @IsNotEmpty()
  stepType: StepTypeEnum;
}
