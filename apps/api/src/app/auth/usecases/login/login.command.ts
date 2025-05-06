import { IsDefined, IsEmail, IsNotEmpty } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class LoginCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}
