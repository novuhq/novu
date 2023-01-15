import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { IEmailBlock, LayoutDescription, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  name: LayoutName;

  @IsString()
  @IsOptional()
  description?: LayoutDescription;

  @IsDefined()
  content: IEmailBlock[];

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
