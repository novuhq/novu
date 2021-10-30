import { IsDefined, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class GetWidgetSettingsCommand {
  static create(data: GetWidgetSettingsCommand) {
    return CommandHelper.create<GetWidgetSettingsCommand>(GetWidgetSettingsCommand, data);
  }

  @IsDefined()
  @IsString()
  identifier: string;
}
