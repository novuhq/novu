import { IsDefined, IsString } from 'class-validator';
import { LayoutId } from '@novu/shared';

import { EnvironmentCommand } from '../../../../shared/commands';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
