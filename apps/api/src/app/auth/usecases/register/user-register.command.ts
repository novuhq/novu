import { IsDefined, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class UserRegisterCommand {
  static create(data: UserRegisterCommand) {
    return CommandHelper.create(UserRegisterCommand, data);
  }

  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  @MinLength(8)
  password: string;

  @IsDefined()
  firstName: string;

  @IsDefined()
  lastName: string;

  @IsOptional()
  organizationName?: string;
}
