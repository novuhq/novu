import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { LayoutDescription, LayoutId, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateLayoutCommand extends EnvironmentWithUserCommand {
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
  content?: string;

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
