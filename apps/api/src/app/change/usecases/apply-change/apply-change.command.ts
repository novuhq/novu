import { IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ApplyChangeCommand extends EnvironmentWithUserCommand {
  static create(data: ApplyChangeCommand) {
    return CommandHelper.create(ApplyChangeCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  changeId: string;
}
