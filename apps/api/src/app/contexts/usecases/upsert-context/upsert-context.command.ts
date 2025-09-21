import { EnvironmentCommand } from '@novu/application-generic';
import { CONTEXT_IDENTIFIER_REGEX, ContextData, ContextType } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { IsContextDataSizeValid } from '../../validators/context-data-size.validator';

export class UpsertContextCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  type: ContextType;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'ID must be between 1 and 100 characters long' })
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'ID must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_)',
  })
  id: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  data?: ContextData;
}
