import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsDefined } from 'class-validator';

class WidgetSettings {
  @IsDefined()
  notificationCenterEncryption: boolean;
}

export class UpdateWidgetSettingsCommand extends EnvironmentCommand {
  static create(data: UpdateWidgetSettingsCommand) {
    return CommandHelper.create(UpdateWidgetSettingsCommand, data);
  }
  @IsDefined()
  widget: WidgetSettings;
}
