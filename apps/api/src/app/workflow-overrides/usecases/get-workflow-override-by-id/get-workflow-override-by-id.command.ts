import { IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowOverrideByIdCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  overrideId: string;
}
