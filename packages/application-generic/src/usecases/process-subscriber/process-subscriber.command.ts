import { IsDefined } from 'class-validator';
import { ISubscribersDefine } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';

export class ProcessSubscriberCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  subscriber: ISubscribersDefine;
}
