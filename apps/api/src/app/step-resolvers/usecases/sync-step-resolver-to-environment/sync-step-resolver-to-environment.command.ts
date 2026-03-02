import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class StepResolverSourceData {
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsOptional()
  @IsString()
  stepResolverHash?: string | null;

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
}
