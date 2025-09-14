import { ContextData } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsContextDataSizeValid } from '../../validators/data-size.validator';

export class UpdateContextCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  data?: ContextData;
}
