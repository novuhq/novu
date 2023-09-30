import { IsDefined, IsString } from 'class-validator';

import { LayoutId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
