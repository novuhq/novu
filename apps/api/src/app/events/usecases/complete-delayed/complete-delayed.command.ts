import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { StepTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CompleteDelayedCommand extends EnvironmentWithUserCommand {
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsString({ each: true })
  @IsOptional()
  transactionId?: string[];

  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsString({ each: true })
  @IsOptional()
  subscriberId?: string[];

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsIn([StepTypeEnum.DIGEST, StepTypeEnum.DELAY])
  @IsOptional()
  stepType?: StepTypeEnum;

  @IsString()
  @IsOptional()
  stepName?: string;

  @IsString()
  @IsOptional()
  digestKey?: string;
}
