import { IsDefined, IsMongoId, IsArray } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class BulkApplyChangeCommand extends EnvironmentWithUserCommand {
  static create(data: BulkApplyChangeCommand) {
    return CommandHelper.create(BulkApplyChangeCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  @IsArray()
  changeIds: string[];
}
