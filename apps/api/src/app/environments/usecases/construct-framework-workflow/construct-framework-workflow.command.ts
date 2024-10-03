import { EnvironmentLevelCommand } from '@novu/application-generic';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class ConstructFrameworkWorkflowCommand extends EnvironmentLevelCommand {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsString()
  @IsOptional()
  stepId?: string;

  @IsObject()
  @IsDefined()
  controlValues: Record<string, unknown>;
}
