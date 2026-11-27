import { IsBoolean } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateSubscriberTokensSettingCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  readonly required: boolean;
}
