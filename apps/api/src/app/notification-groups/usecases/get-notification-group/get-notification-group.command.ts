import { IsString, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationGroupCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  id: string;
}
