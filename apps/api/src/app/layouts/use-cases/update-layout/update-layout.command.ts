import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { IEmailBlock, LayoutDescription, LayoutId, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;

  @IsString()
  @IsOptional()
  name?: LayoutName;

  @IsString()
  @IsOptional()
  description?: LayoutDescription;

  @IsOptional()
  content?: IEmailBlock[];

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
