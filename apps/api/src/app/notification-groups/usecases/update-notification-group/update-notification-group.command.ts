import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateNotificationGroupCommand extends EnvironmentWithUserCommand {
  @IsString()
  id: string;

  @IsString()
  name: string;
}
