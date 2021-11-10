import { IsDefined, ValidateNested } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

class TwillioSettings {
  @IsDefined()
  authToken: string;

  @IsDefined()
  accountSid: string;

  @IsDefined()
  phoneNumber;
}

export class UpdateSmsSettingsCommand extends ApplicationWithUserCommand {
  static create(data: UpdateSmsSettingsCommand) {
    return CommandHelper.create<UpdateSmsSettingsCommand>(UpdateSmsSettingsCommand, data);
  }

  @IsDefined()
  @ValidateNested()
  twillio: TwillioSettings;
}
