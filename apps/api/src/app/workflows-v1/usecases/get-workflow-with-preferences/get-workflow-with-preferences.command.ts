import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetWorkflowWithPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  workflowIdOrInternalId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
