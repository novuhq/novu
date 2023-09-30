import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';
import { IItem } from './create-change/create-change.command';

export class PromoteTypeChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  item: IItem;
}
