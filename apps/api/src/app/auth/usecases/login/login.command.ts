import { IsDefined, IsEmail, IsNotEmpty } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class LoginCommand {
  static create(data: LoginCommand) {
    return CommandHelper.create(LoginCommand, data);
  }

  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}
