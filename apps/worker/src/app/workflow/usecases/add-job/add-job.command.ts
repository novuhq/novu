import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { JobEntity, NotificationEntity } from '@novu/dal';
import { StatelessControls } from '@novu/shared';
import { IsDefined } from 'class-validator';

export type PartialNotificationEntity = Pick<
  NotificationEntity,
  | '_id'
  | '_templateId'
  | '_organizationId'
  | '_environmentId'
  | '_subscriberId'
  | 'transactionId'
  | 'channels'
  | 'to'
  | 'payload'
  | 'controls'
  | 'topics'
  | '_digestedNotificationId'
  | 'createdAt'
  | 'severity'
  | 'critical'
  | 'contextKeys'
  | 'tags'
>;

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  job: JobEntity;

  notification?: PartialNotificationEntity | null;

  controls?: StatelessControls;
}
