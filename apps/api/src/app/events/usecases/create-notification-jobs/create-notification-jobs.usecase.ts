import { Injectable, Logger } from '@nestjs/common';
import { JobEntity, JobStatusEnum, NotificationRepository, NotificationStepEntity } from '@novu/dal';
import { STEP_TYPE_TO_CHANNEL_TYPE, InAppProviderIdEnum, StepTypeEnum } from '@novu/shared';

import { CreateNotificationJobsCommand } from './create-notification-jobs.command';

import { DigestFilterSteps, DigestFilterStepsCommand } from '../digest-filter-steps';

import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ApiException } from '../../../shared/exceptions/api.exception';

const LOG_CONTEXT = 'CreateNotificationUseCase';

type NotificationJob = Omit<JobEntity, '_id'>;

@Injectable()
export class CreateNotificationJobs {
  constructor(
    private digestFilterSteps: DigestFilterSteps,
    private getDecryptedIntegrations: GetDecryptedIntegrations,
    private notificationRepository: NotificationRepository
  ) {}

  public async execute(command: CreateNotificationJobsCommand): Promise<NotificationJob[]> {
    const notification = await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriber._id,
      _templateId: command.template._id,
      transactionId: command.transactionId,
      to: command.to,
      payload: command.payload,
    });

    if (!notification) {
      const message = 'Notification could not be created';
      Logger.error(message, LOG_CONTEXT);
      throw new ApiException(message);
    }

    const steps: NotificationStepEntity[] = await this.digestFilterSteps.execute(
      DigestFilterStepsCommand.create({
        subscriberId: command.subscriber._id,
        payload: command.payload,
        steps: command.template?.steps,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        templateId: command.template._id,
        notificationId: notification._id,
      })
    );

    const jobs: NotificationJob[] = [];

    for (const step of steps) {
      if (!step.template) throw new ApiException('Step template was not found');

      const providerId = await this.getProviderId(
        command.userId,
        command.organizationId,
        command.environmentId,
        step.template.type
      );

      const job = {
        identifier: command.identifier,
        payload: command.payload,
        overrides: command.overrides,
        step,
        transactionId: command.transactionId,
        _notificationId: notification._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _userId: command.userId,
        _subscriberId: command.subscriber._id,
        status: JobStatusEnum.PENDING,
        _templateId: notification._templateId,
        digest: step.metadata,
        type: step.template.type,
        providerId: providerId,
        ...(command.actor && { _actorId: command.actor?._id }),
      };

      jobs.push(job);
    }

    return jobs;
  }

  private async getProviderId(
    userId: string,
    organizationId: string,
    environmentId: string,
    stepType: StepTypeEnum
  ): Promise<string | undefined> {
    const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(stepType);

    if (!channelType) return;

    const integrations = await this.getDecryptedIntegrations.execute(
      GetDecryptedIntegrationsCommand.create({
        channelType: channelType,
        active: true,
        organizationId,
        environmentId,
        userId,
      })
    );
    const integration = integrations[0];

    return integration?.providerId ?? InAppProviderIdEnum.Novu;
  }
}
