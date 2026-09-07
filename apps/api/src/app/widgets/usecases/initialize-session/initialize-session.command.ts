import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class InitializeSessionCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  subscriberId: string;

  @IsDefined()
  @IsString()
  applicationIdentifier: string;

  firstName?: string;

  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  hmacHash?: string;
}
