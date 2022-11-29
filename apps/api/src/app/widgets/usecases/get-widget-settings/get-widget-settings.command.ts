import { IsDefined, IsString } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';

export class GetWidgetSettingsCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  identifier: string;
}
