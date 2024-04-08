import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsImageUrl } from '../../../shared/validators/image.validator';

export class UpdateNameAndProfilePictureCommand extends EnvironmentWithUserCommand {
  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
  })
  @IsImageUrl({
    message: 'Profile picture must be a valid image URL with one of the following extensions: jpg, jpeg, png, gif, svg',
  })
  @IsOptional()
  profilePicture?: string;

  @IsDefined()
  @IsString()
  firstName: string;

  @IsString()
  @IsDefined()
  lastName: string;
}
