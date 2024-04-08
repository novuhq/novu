import { MimeTypesEnum } from '@novu/shared';
import { IsEnum, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetUserProfilePictureSignedUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsEnum(MimeTypesEnum)
  extension: string;
}
