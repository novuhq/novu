import { ControlValuesLevelEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class UpsertControlValuesCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  stepId?: string;

  @IsString()
  @IsOptional()
  layoutId?: string;

  @IsEnum(ControlValuesLevelEnum)
  @IsNotEmpty()
  level: ControlValuesLevelEnum;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsObject()
  @IsOptional()
  newControlValues?: Record<string, unknown>;
}
