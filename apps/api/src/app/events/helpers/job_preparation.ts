import { JobEntity, JobStatusEnum, NotificationEntity } from '@novu/dal';
import { StepWithDelay } from './helpers';
import { ApiException } from '../../shared/exceptions/api.exception';
import { ProcessNotificationCommand } from '../usecases/process-notification/process-notification.command';
import { ChannelTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';

export type NotificationJob = Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>;

export async function prepareJob(
  command: ProcessNotificationCommand,
  notification: NotificationEntity,
  stepWithDelay: StepWithDelay
): Promise<NotificationJob> {
  const { delay = 0, ...step } = stepWithDelay;
  if (!step.template) throw new ApiException('Step template was not found');
  const providerId = command.templateProviderIds.get(
    STEP_TYPE_TO_CHANNEL_TYPE.get(step.template.type) as ChannelTypeEnum
  );

  return {
    identifier: command.identifier,
    overrides: command.overrides,
    _userId: command.userId,
    transactionId: notification.transactionId,
    payload: notification.payload,
    _notificationId: notification._id,
    _environmentId: notification._environmentId,
    _organizationId: notification._organizationId,
    _subscriberId: notification._subscriberId,
    status: JobStatusEnum.PENDING,
    _templateId: notification._templateId,
    providerId,
    step,
    digest: step.metadata,
    type: step.template?.type,
    delay: delay,
    ...(command.actorSubscriber && { _actorId: command.actorSubscriber._id }),
  };
}

export async function prepareChildJob(
  command: ProcessNotificationCommand | null,
  parentJob: JobEntity,
  stepWithDelay: StepWithDelay
): Promise<NotificationJob> {
  const { delay = 0, ...step } = stepWithDelay;
  if (!step.template) throw new ApiException('Step template was not found');
  const providerId = command
    ? command.templateProviderIds.get(STEP_TYPE_TO_CHANNEL_TYPE.get(step.template.type) as ChannelTypeEnum)
    : undefined;

  return {
    identifier: parentJob.identifier,
    overrides: parentJob.overrides,
    _userId: parentJob._userId,
    transactionId: parentJob.transactionId,
    payload: parentJob.payload,
    _notificationId: parentJob._notificationId,
    _environmentId: parentJob._environmentId,
    _organizationId: parentJob._organizationId,
    _subscriberId: parentJob._subscriberId,
    status: JobStatusEnum.PENDING,
    _templateId: parentJob._templateId,
    providerId,
    step,
    digest: step.metadata,
    digestedNotificationIds: parentJob.digestedNotificationIds,
    type: step.template?.type,
    delay: delay,
    ...(parentJob._actorId && { _actorId: parentJob._actorId }),
  };
}
