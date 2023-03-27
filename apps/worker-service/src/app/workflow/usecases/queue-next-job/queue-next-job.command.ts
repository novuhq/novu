import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands';

export class QueueNextJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  parentId: string;
}
