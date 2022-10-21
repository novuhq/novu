import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityCommand extends EnvironmentWithUserCommand {
  @IsString()
  notificationId: string;
}
