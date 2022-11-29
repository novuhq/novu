import { IsDefined, IsEmail } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateMailSettingsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsEmail()
  senderEmail: string;

  @IsDefined()
  senderName: string;
}
