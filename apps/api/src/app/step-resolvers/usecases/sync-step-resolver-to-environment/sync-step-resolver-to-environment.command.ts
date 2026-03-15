import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { ClientSession } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { Exclude, Type } from 'class-transformer';
import { IsArray, IsDefined, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class StepResolverSourceData {
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsEnum(StepTypeEnum)
  stepType: StepTypeEnum;

  @IsOptional()
  @IsString()
  stepResolverHash?: string;

  @IsOptional()
  controlSchema?: Record<string, unknown> | null;
}

export class StepResolverTargetData {
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsOptional()
  @IsString()
  stepResolverHash?: string;
}

export class SyncStepResolverToEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  targetEnvironmentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepResolverSourceData)
  sourceSteps: StepResolverSourceData[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepResolverTargetData)
  targetSteps: StepResolverTargetData[];

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
