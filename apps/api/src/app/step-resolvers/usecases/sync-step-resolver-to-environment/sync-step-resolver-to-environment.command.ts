import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsArray, IsDefined, IsString } from 'class-validator';

export class StepResolverSourceData {
  stepId: string;
  stepResolverHash?: string | null;
  controlSchema?: Record<string, unknown> | null;
}

export class StepResolverTargetData {
  stepId: string;
  templateId: string;
}

export class SyncStepResolverToEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  targetEnvironmentId: string;

  @IsArray()
  sourceSteps: StepResolverSourceData[];

  @IsArray()
  targetSteps: StepResolverTargetData[];
}
