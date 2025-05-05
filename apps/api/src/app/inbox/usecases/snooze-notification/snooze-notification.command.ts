import { IsDate, IsDefined, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class SnoozeNotificationCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  readonly notificationId: string;

  @Type(() => Date)
  @IsDate()
  readonly snoozeUntil: Date;
}
