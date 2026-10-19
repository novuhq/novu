import { EnvironmentId } from '@novu/shared';
import { IsDefined, IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateProfileEmailCommand extends AuthenticatedCommand {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsMongoId()
  @IsNotEmpty()
  environmentId: EnvironmentId;
}
