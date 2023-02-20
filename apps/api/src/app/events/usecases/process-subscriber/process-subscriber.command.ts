import { IsDefined, IsString, IsOptional } from 'class-validator';
import { ISubscribersDefine } from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ProcessSubscriberCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  subscriber: ISubscribersDefine;
}
