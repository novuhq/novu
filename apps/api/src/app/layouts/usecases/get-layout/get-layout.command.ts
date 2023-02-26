import { IsDefined, IsString } from 'class-validator';

import { LayoutId } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
