import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDefined, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class DeployStepResolverManifestStepCommand {
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsNotEmpty()
  stepId: string;
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
