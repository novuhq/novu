import { IsDefined, IsEmail } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class PasswordResetRequestCommand {
  static create(data: PasswordResetRequestCommand) {
    return CommandHelper.create<PasswordResetRequestCommand>(PasswordResetRequestCommand, data);
  }

  @IsEmail()
  @IsDefined()
  email: string;
}
