import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateWidgetSettingsCommand extends EnvironmentCommand {
  @IsDefined()
  notificationCenterEncryption: boolean;
}
