import { IsDefined, IsMongoId, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowOverrideCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  _workflowId: string;

  @IsMongoId()
  @IsDefined()
  _tenantId: string;
}
