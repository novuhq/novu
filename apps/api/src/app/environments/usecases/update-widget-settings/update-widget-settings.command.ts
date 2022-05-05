import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsDefined } from 'class-validator';

export class UpdateWidgetSettingsCommand extends EnvironmentCommand {
  static create(data: UpdateWidgetSettingsCommand) {
    return CommandHelper.create(UpdateWidgetSettingsCommand, data);
  }
  @IsDefined()
  notificationCenterEncryption: boolean;
}
