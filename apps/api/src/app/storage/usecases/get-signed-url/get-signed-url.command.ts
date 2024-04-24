import { IsDefined, IsEnum, IsIn, IsString } from 'class-validator';
import { UploadTypesEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetSignedUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsIn(['jpg', 'png', 'jpeg'])
  extension: string;

  @IsDefined()
  @IsEnum(UploadTypesEnum)
  type: UploadTypesEnum;
}
