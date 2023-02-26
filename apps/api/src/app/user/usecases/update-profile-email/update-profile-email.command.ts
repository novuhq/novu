import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { IsBoolean, IsDefined, IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileEmailCommand extends AuthenticatedCommand {
  @IsEmail()
  @IsDefined()
  email: string;
}
