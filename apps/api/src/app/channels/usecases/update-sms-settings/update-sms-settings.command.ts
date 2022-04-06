import { IsDefined, ValidateNested } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

class TwillioSettings {
  @IsDefined()
  authToken: string;

  @IsDefined()
  accountSid: string;

  @IsDefined()
  phoneNumber;
}

export class UpdateSmsSettingsCommand extends EnvironmentWithUserCommand {
  static create(data: UpdateSmsSettingsCommand) {
    return CommandHelper.create<UpdateSmsSettingsCommand>(UpdateSmsSettingsCommand, data);
  }

  @IsDefined()
  @ValidateNested()
  twillio: TwillioSettings;
}
