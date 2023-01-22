import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { LayoutDescription, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  name: LayoutName;

  @IsString()
  @IsOptional()
  description?: LayoutDescription;

  @IsDefined()
  content: string;

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
