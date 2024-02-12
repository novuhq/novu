import { IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteWorkflowOverrideCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  _id: string;
}
