import { ClientSession } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
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

  /**
   * Exclude session from the command to avoid serializing it in the response.
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
