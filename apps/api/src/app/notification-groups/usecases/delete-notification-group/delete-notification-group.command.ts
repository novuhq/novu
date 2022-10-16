import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteNotificationGroupCommand extends EnvironmentWithUserCommand {
  @IsString()
  id: string;
}
