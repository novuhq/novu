import { IsDefined, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetPreferencesCommand extends EnvironmentCommand {
  static create(data: GetPreferencesCommand) {
    return CommandHelper.create(GetPreferencesCommand, data);
  }

  @IsString()
  @IsDefined()
  subscriberId: string;
}
