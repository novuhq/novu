import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { LayoutId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateLayoutChangeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
