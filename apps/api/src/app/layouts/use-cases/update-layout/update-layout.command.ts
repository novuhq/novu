import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { IEmailBlock, LayoutId, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;

  @IsString()
  @IsOptional()
  name?: LayoutName;

  @IsOptional()
  content?: IEmailBlock[];

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
