import { IsDefined, IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';
import { EnvironmentId } from '@novu/shared';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateProfileEmailCommand extends AuthenticatedCommand {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsMongoId()
  @IsNotEmpty()
  environmentId: EnvironmentId;
}
