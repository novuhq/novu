import { CONTEXT_IDENTIFIER_REGEX, ContextData, ContextTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsContextDataSizeValid } from '../../validators/data-size.validator';

export class CreateContextCommand extends EnvironmentCommand {
  @IsEnum(ContextTypeEnum)
  @IsNotEmpty()
  type: ContextTypeEnum;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Identifier must be between 1 and 100 characters long' })
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'Identifier must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_)',
  })
  identifier: string;

  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  data: ContextData;
}
