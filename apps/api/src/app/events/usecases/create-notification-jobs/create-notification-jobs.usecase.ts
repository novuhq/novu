import { Injectable, Logger } from '@nestjs/common';
import {
  JobEntity,
  JobStatusEnum,
  MessageTemplateEntity,
  NotificationEntity,
  NotificationRepository,
  NotificationStepEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  StepTypeEnum,
} from '@novu/shared';

import { CreateNotificationJobsCommand } from './create-notification-jobs.command';

import { DigestFilterSteps, DigestFilterStepsCommand } from '../digest-filter-steps';
import { EventsPerformanceService } from '../../services/performance-service';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';
import { AddJob } from '../add-job';

const LOG_CONTEXT = 'CreateNotificationUseCase';

type NotificationJob = Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CreateNotificationJobs {
  constructor(
    private digestFilterSteps: DigestFilterSteps,
    private notificationRepository: NotificationRepository,
    protected performanceService: EventsPerformanceService
  ) {}

  public async execute(command: CreateNotificationJobsCommand): Promise<NotificationJob[]> {
    const mark = this.performanceService.buildCreateNotificationJobsMark(
      command.identifier,
      command.transactionId,
      command.to.subscriberId
    );

    const notification = await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriber._id,
      _templateId: command.template._id,
      transactionId: command.transactionId,
      to: command.to,
      payload: command.payload,
      expireAt: this.calculateExpireAt(command),
    });

    if (!notification) {
      const message = 'Notification could not be created';
      Logger.error(message, LOG_CONTEXT);
      throw new ApiException(message);
    }

    const jobs: NotificationJob[] = [];

    const steps = await this.createSteps(command, notification);

    for (const step of steps) {
      if (!step.template) throw new ApiException('Step template was not found');

      const providerId = command.templateProviderIds.get(
        STEP_TYPE_TO_CHANNEL_TYPE.get(step.template.type) as ChannelTypeEnum
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
        expireAt: notification.expireAt,
        ...(command.actor && { _actorId: command.actor?._id }),
      };

      jobs.push(job);
    }

    this.performanceService.setEnd(mark);

    return jobs;
  }

  private async createSteps(
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity
  ): Promise<NotificationStepEntity[]> {
    const activeSteps = this.filterActiveSteps(command.template.steps);

    return await this.filterDigestSteps(command, notification, activeSteps);
  }

  private filterActiveSteps(steps: NotificationStepEntity[]): NotificationStepEntity[] {
    return steps.filter((step) => step.active === true);
  }

  private async filterDigestSteps(
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity,
    steps: NotificationStepEntity[]
  ): Promise<NotificationStepEntity[]> {
    // TODO: Review this for workflows with more than one digest as this will return the first element found
    const digestStep = steps.find((step) => step.template?.type === StepTypeEnum.DIGEST);

    if (digestStep && digestStep.metadata?.type) {
      return await this.digestFilterSteps.execute(
        DigestFilterStepsCommand.create({
          subscriberId: command.subscriber._id,
          payload: command.payload,
          steps: command.template.steps,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          templateId: command.template._id,
          notificationId: notification._id,
          transactionId: command.transactionId,
          type: digestStep.metadata.type as DigestTypeEnum, // We already checked it is a DIGEST
        })
      );
    }

    return steps;
  }

  private calculateExpireAt(command: CreateNotificationJobsCommand) {
    const delayedSteps = command.template.steps.filter(
      (step) => step.template?.type === StepTypeEnum.DIGEST || step.template?.type === StepTypeEnum.DELAY
    );

    const delay = delayedSteps
      .map((step) => this.calculateDelayAmount(step, command.payload, command.overrides))
      .reduce((partialSum, a) => partialSum + a, 0);

    return addMilliseconds(Date.now(), delay);
  }

  private calculateDelayAmount(step: NotificationStepEntity, payload: any, overrides: any): number {
    if (!step.metadata) throw new ApiException(`Step metadata not found`);

    if (step.metadata.type === DelayTypeEnum.SCHEDULED) {
      const delayPath = step.metadata.delayPath;
      if (!delayPath) throw new ApiException(`Delay path not found`);

      const delayDate = payload[delayPath];

      const delay = differenceInMilliseconds(new Date(delayDate), new Date());

      if (delay < 0) {
        throw new ApiException(`Delay date at path ${delayPath} must be a future date`);
      }

      return delay;
    }

    if (this.checkValidDelayOverride(overrides)) {
      return AddJob.toMilliseconds(overrides.delay.amount as number, overrides.delay.unit as DigestUnitEnum);
    }

    return AddJob.toMilliseconds(step.metadata.amount as number, step.metadata.unit as DigestUnitEnum);
  }
  private checkValidDelayOverride(overrides: any): boolean {
    if (!overrides?.delay) {
      return false;
    }
    const values = Object.values(DigestUnitEnum);

    return (
      typeof overrides.delay.amount === 'number' && values.includes(overrides.delay.unit as unknown as DigestUnitEnum)
    );
  }
}
