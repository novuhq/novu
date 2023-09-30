import { IsDefined, IsString } from 'class-validator';
import { LayoutId } from '@novu/shared';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class FindMessageTemplatesByLayoutCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  layoutId: string;
}
