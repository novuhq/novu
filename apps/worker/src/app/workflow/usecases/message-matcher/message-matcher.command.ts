import { IsDefined, IsString } from 'class-validator';
import { NotificationStepEntity, JobEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class MessageMatcherCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  step: NotificationStepEntity;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  subscriberId: string;

  @IsDefined()
  _subscriberId: string;

  @IsDefined()
  job: JobEntity;
}
