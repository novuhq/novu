import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UnsnoozeNotificationCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  readonly notificationId: string;
}
