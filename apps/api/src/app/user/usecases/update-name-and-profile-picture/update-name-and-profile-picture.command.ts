import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateNameAndProfilePictureCommand extends EnvironmentWithUserCommand {
  @IsUrl({ require_tld: false })
  @IsOptional()
  profilePicture?: string;

  @IsDefined()
  @IsString()
  firstName: string;

  @IsString()
  @IsDefined()
  lastName: string;
}
