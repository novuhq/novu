import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { addMilliseconds, addMonths } from 'date-fns';
import {
  JobEntity,
  JobStatusEnum,
  NotificationEntity,
  NotificationRepository,
  NotificationStepEntity,
} from '@novu/dal';
import {
  DigestTypeEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  StepTypeEnum,
  isBridgeWorkflow,
} from '@novu/shared';

import {
  DigestFilterSteps,
  DigestFilterStepsCommand,
} from '../digest-filter-steps';
import { InstrumentUsecase } from '../../instrumentation';
import { CreateNotificationJobsCommand } from './create-notification-jobs.command';
import { PlatformException } from '../../utils/exceptions';
import { ComputeJobWaitDurationService } from '../../services';

const LOG_CONTEXT = 'CreateNotificationUseCase';
type NotificationJob = Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CreateNotificationJobs {
  constructor(
    private digestFilterSteps: DigestFilterSteps,
    private notificationRepository: NotificationRepository,
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: CreateNotificationJobsCommand,
  ): Promise<NotificationJob[]> {
    const activeSteps = this.filterActiveSteps(command.template.steps);

    const channels = activeSteps
      .map((item) => item.template.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    const notification = await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriber._id,
      _templateId: command.template._id,
      transactionId: command.transactionId,
      to: command.to,
      payload: command.payload,
      expireAt: this.calculateExpireAt(command),
      channels,
      controls: command.controls,
      tags: command.template.tags,
    });

    if (!notification) {
      const message = 'Notification could not be created';
      const error = new PlatformException(message);
      Logger.error(error, message, LOG_CONTEXT);
      throw error;
    }

    let jobs: NotificationJob[] = [];

    const steps = await this.createSteps(command, activeSteps, notification);

    jobs = this.addTriggerJob(steps, command, notification, jobs);

    for (const step of steps) {
      if (!step.template) {
        throw new PlatformException('Step template was not found');
      }

      const channel = STEP_TYPE_TO_CHANNEL_TYPE.get(step.template.type);
      const providerId = command.templateProviderIds[channel];

      const job = {
        identifier: command.identifier,
        payload: command.payload,
        overrides: command.overrides,
        tenant: command.tenant,
        step: {
          ...step,
          ...(command.bridgeUrl ? { bridgeUrl: command.bridgeUrl } : {}),
        },
        transactionId: command.transactionId,
        _notificationId: notification._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _userId: command.userId,
        subscriberId: command.subscriber.subscriberId,
        _subscriberId: command.subscriber._id,
        status: JobStatusEnum.PENDING,
        _templateId: notification._templateId,
        digest: step.metadata,
        type: step.template.type,
        providerId,
        expireAt: notification.expireAt,
        ...(command.actor && {
          _actorId: command.actor?._id,
          actorId: command.actor?.subscriberId,
        }),
        preferences: command.preferences,
      };

      jobs.push(job);
    }

    return jobs;
  }

  private addTriggerJob(
    steps: NotificationStepEntity[],
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity,
    jobs: NotificationJob[],
  ): NotificationJob[] {
    const normalizedJobs = [...jobs];

    const triggerStepExist = steps.some(
      (step) => step.template.type === StepTypeEnum.TRIGGER,
    );

    if (triggerStepExist) {
      return normalizedJobs;
    }

    const job = {
      identifier: command.identifier,
      payload: command.payload,
      overrides: command.overrides,
      tenant: command.tenant,
      step: {
        bridgeUrl: command.bridgeUrl,
        template: {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _creatorId: command.userId,
          _layoutId: null,
          type: StepTypeEnum.TRIGGER,
          content: '',
        },
        _templateId: notification._templateId,
      },
      type: StepTypeEnum.TRIGGER,
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _userId: command.userId,
      _subscriberId: command.subscriber._id,
      _templateId: notification._templateId,
      subscriberId: command.subscriber.subscriberId,
      transactionId: command.transactionId,
      status: JobStatusEnum.PENDING,
      expireAt: notification.expireAt,
      ...(command.actor && {
        _actorId: command.actor?._id,
        actorId: command.actor?.subscriberId,
      }),
    };

    normalizedJobs.push(job);

    return normalizedJobs;
  }

  private async createSteps(
    command: CreateNotificationJobsCommand,
    activeSteps: NotificationStepEntity[],
    notification: NotificationEntity,
  ): Promise<NotificationStepEntity[]> {
    return await this.filterDigestSteps(command, notification, activeSteps);
  }

  private filterActiveSteps(
    steps: NotificationStepEntity[],
  ): NotificationStepEntity[] {
    return steps.filter((step) => step.active === true);
  }

  private async filterDigestSteps(
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity,
    steps: NotificationStepEntity[],
  ): Promise<NotificationStepEntity[]> {
    // TODO: Review this for workflows with more than one digest as this will return the first element found
    const digestStep = steps.find(
      (step) => step.template?.type === StepTypeEnum.DIGEST,
    );

    if (digestStep?.metadata?.type) {
      return await this.digestFilterSteps.execute(
        DigestFilterStepsCommand.create({
          _subscriberId: command.subscriber._id,
          payload: command.payload,
          steps: command.template.steps,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          templateId: command.template._id,
          notificationId: notification._id,
          transactionId: command.transactionId,
          type: digestStep.metadata.type as DigestTypeEnum, // We already checked it is a DIGEST
          backoff:
            'backoff' in digestStep.metadata
              ? digestStep.metadata.backoff
              : undefined,
        }),
      );
    }

    return steps;
  }

  private calculateExpireAt(command: CreateNotificationJobsCommand) {
    try {
      /*
       * If the workflow is a framework workflow, we'll set the expiration date to 1 month from now
       * todo decide if we want to add another request in order to get more accurate expire at amount
       */
      if (isBridgeWorkflow(command.template.type)) {
        return addMonths(Date.now(), 1);
      }

      const delayedSteps = command.template.steps.filter(
        (step) =>
          step.template?.type === StepTypeEnum.DIGEST ||
          step.template?.type === StepTypeEnum.DELAY,
      );

      const delay = delayedSteps
        .map((step) =>
          this.computeJobWaitDurationService.calculateDelay({
            stepMetadata: step.metadata,
            payload: command.payload,
            overrides: command.overrides,
          }),
        )
        .reduce((sum, delayAmount) => sum + delayAmount, 0);

      return addMilliseconds(Date.now(), delay);
    } catch (e) {
      /*
       * If the user has entered an incorrect negative delay,
       * we'll accept it as a temporary solution to enable printing error execution details later in the process when a job is available.
       */
      return addMonths(Date.now(), 1);
    }
  }
}
