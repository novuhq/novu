import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

export class GetExecutionDetailsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  notificationId: string;

  @IsDefined()
  subscriberId: string;
}
