import { EnvironmentLevelCommand } from '@novu/application-generic';
import { IsDefined, IsObject, IsString } from 'class-validator';

export class ConstructFrameworkWorkflowCommand extends EnvironmentLevelCommand {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsObject()
  @IsDefined()
  controlValues: Record<string, unknown>;
}
