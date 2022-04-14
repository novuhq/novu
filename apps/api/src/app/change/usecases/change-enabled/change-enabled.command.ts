import { ChangeEntityTypeEnum } from '@novu/dal';
import { IsDefined, IsMongoId, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ChangeEnabledCommand extends EnvironmentWithUserCommand {
  static create(data: ChangeEnabledCommand) {
    return CommandHelper.create(ChangeEnabledCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  itemId: string;

  @IsDefined()
  @IsString()
  type: ChangeEntityTypeEnum;
}
