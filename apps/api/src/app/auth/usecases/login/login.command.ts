import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsEmail, IsNotEmpty } from 'class-validator';

export class LoginCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}
