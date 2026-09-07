import { IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class DeleteNotificationCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  readonly notificationId: string;
}
