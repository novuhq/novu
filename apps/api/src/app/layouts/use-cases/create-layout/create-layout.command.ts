import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { IEmailBlock, LayoutName, LayoutVariables } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  name: LayoutName;

  @IsDefined()
  content: IEmailBlock[];

  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
