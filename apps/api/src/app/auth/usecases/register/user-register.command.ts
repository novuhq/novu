import { IsDefined, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';

export class UserRegisterCommand extends BaseCommand {
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
