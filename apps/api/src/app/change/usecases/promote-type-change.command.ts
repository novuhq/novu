import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';
import { IItem } from '@novu/application-generic';

export class PromoteTypeChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  item: IItem;
}
