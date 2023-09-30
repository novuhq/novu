import { IsString, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateNotificationGroupCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  name: string;
}
