import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DeployStepResolverManifestStepCommand {
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsEnum(StepTypeEnum)
  @IsNotEmpty()
  stepType: StepTypeEnum;

  @IsOptional()
  @IsObject()
  controlSchema?: Record<string, unknown>;
}

export class DeployStepResolverCommand extends EnvironmentWithUserObjectCommand {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeployStepResolverManifestStepCommand)
  manifestSteps: DeployStepResolverManifestStepCommand[];

  @IsDefined()
  bundleBuffer: Buffer;
}
