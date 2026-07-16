import { FileExtensionEnum, UploadTypesEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsIn, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetSignedUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsIn(Object.values(FileExtensionEnum))
  extension: string;

  @IsDefined()
  @IsEnum(UploadTypesEnum)
  type: UploadTypesEnum;
}
