import { IsEnum, IsIn, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export enum MimeTypesEnum {
  JPEG = 'jpeg',
  PNG = 'png',
  JPG = 'jpg',
}
export class GetUserProfilePictureSignedUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsEnum(MimeTypesEnum)
  extension: string;
}

export const MIME_TYPES_LOOKUP: Record<MimeTypesEnum, string> = {
  [MimeTypesEnum.JPEG]: 'image/jpeg',
  [MimeTypesEnum.PNG]: 'image/png',
  [MimeTypesEnum.JPG]: 'image/jpeg',
};
