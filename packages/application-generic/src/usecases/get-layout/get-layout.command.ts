import { IsDefined, IsString } from 'class-validator';
import { LayoutId } from '@novu/shared';

import { EnvironmentCommand } from '../../commands/project.command';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
