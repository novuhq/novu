import { IsDefined } from 'class-validator';
import { ISubscribersDefine } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ProcessSubscriberCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  subscriber: ISubscribersDefine;
}
