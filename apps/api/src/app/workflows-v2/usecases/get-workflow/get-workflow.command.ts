import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class GetWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsOptional()
  environmentId?: string;
}
