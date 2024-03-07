import { IsDefined, IsString, MinLength } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdatePasswordCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @IsDefined()
  @MinLength(8)
  confirmPassword: string;

  @IsString()
  @IsDefined()
  @MinLength(8)
  newPassword: string;
}
