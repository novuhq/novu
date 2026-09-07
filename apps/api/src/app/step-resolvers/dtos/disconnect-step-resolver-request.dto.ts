import { StepTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class DisconnectStepResolverRequestDto {
  @IsEnum(StepTypeEnum)
  @IsNotEmpty()
  stepType: StepTypeEnum;
}
