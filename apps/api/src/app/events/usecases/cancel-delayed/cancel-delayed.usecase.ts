import { Injectable } from '@nestjs/common';
import {
  isActionStepType,
  isMainDigest,
  LogRepository,
  MessageInteractionService,
  MessageInteractionTrace,
  PinoLogger,
  StepRunRepository,
  StepType,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, StepTypeEnum } from '@novu/shared';

import { CancelDelayedCommand } from './cancel-delayed.command';

@Injectable()
export class CancelDelayed {
  constructor(
    private jobRepository: JobRepository,
    private stepRunRepository: StepRunRepository,
    private messageInteractionService: MessageInteractionService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    let jobs: JobEntity[] = await this.jobRepository.find({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: [JobStatusEnum.DELAYED, JobStatusEnum.MERGED],
    });

    if (!jobs?.length) {
      return false;
    }

    if (jobs.find((job) => job.type && isActionStepType(job.type))) {
      const possiblePendingJobs: JobEntity[] = await this.jobRepository.find({
        _environmentId: command.environmentId,
        transactionId: command.transactionId,
        status: [JobStatusEnum.PENDING],
      });

      jobs = [...jobs, ...possiblePendingJobs];
    }

    await this.jobRepository.update(
      {
        _environmentId: command.environmentId,
        _id: {
          $in: jobs.map((job) => job._id),
        },
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
          deliveryLifecycleState: {
            status: DeliveryLifecycleStatusEnum.CANCELED,
            detail: DeliveryLifecycleDetail.EXECUTION_CANCELED_BY_USER,
          },
        },
      }
    );

    await this.recordCancellationTraces(jobs);

    await this.stepRunRepository.createMany(jobs, {
      status: JobStatusEnum.CANCELED,
    });

    const mainDigestJob = jobs.find((job) => isMainDigest(job.type, job.status));

    if (!mainDigestJob) {
      return true;
    }

    return await this.assignNextDigestJob(mainDigestJob);
  }

  private async assignNextDigestJob(job: JobEntity) {
    const mainFollowerDigestJob = await this.jobRepository.findOne(
      {
        _mergedDigestId: job._id,
        status: JobStatusEnum.MERGED,
        type: StepTypeEnum.DIGEST,
        _environmentId: job._environmentId,
        _subscriberId: job._subscriberId,
      },
      '',
      {
        query: { sort: { createdAt: 1 } },
      }
    );

    // meaning that only one trigger was send, and it was cancelled in the CancelDelayed.execute
    if (!mainFollowerDigestJob) {
      return true;
    }

    await this.stepRunRepository.create(mainFollowerDigestJob, {
      status: JobStatusEnum.DELAYED,
    });

    // update new main follower from Merged to Delayed
    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        status: JobStatusEnum.MERGED,
        _id: mainFollowerDigestJob._id,
      },
      {
        $set: {
          status: JobStatusEnum.DELAYED,
          _mergedDigestId: null,
        },
      }
    );

    // update all main follower children jobs to pending status
    await this.jobRepository.updateAllChildJobStatus(
      mainFollowerDigestJob,
      JobStatusEnum.PENDING,
      mainFollowerDigestJob._id
    );

    // update all jobs that were merged into the old main digest job to point to the new follower
    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        status: JobStatusEnum.MERGED,
        _mergedDigestId: job._id,
      },
      {
        $set: {
          _mergedDigestId: mainFollowerDigestJob._id,
        },
      }
    );

    return true;
  }

  private async recordCancellationTraces(jobs: JobEntity[]): Promise<void> {
    try {
      const interactionTraces: MessageInteractionTrace[] = jobs.map((job) => ({
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: job._organizationId,
        environment_id: job._environmentId,
        user_id: job._userId || '',
        subscriber_id: job._subscriberId ?? '',
        external_subscriber_id: job.subscriberId ?? '',
        event_type: 'step_canceled' as const,
        title: 'Step canceled',
        message: 'Step execution was canceled by Novu platform user',
        raw_data: JSON.stringify({
          message: 'Step execution was canceled by Novu platform user',
        }),
        status: 'success' as const,
        entity_id: job._id,
        step_run_type: this.mapStepTypeEnumToStepType(job.type) ?? '',
        workflow_run_identifier: job.identifier || '',
        _notificationId: job._notificationId,
        workflow_id: job._templateId,
        provider_id: '',
      }));

      await this.messageInteractionService.trace(
        interactionTraces,
        DeliveryLifecycleStatusEnum.CANCELED,
        DeliveryLifecycleDetail.EXECUTION_CANCELED_BY_USER
      );
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create cancel traces');
    }
  }

  private mapStepTypeEnumToStepType(stepType: StepTypeEnum | undefined): StepType | null {
    switch (stepType) {
      case StepTypeEnum.EMAIL:
        return 'email';
      case StepTypeEnum.SMS:
        return 'sms';
      case StepTypeEnum.IN_APP:
        return 'in_app';
      case StepTypeEnum.PUSH:
        return 'push';
      case StepTypeEnum.CHAT:
        return 'chat';
      case StepTypeEnum.DIGEST:
        return 'digest';
      case StepTypeEnum.THROTTLE:
        return 'throttle';
      case StepTypeEnum.TRIGGER:
        return 'trigger';
      case StepTypeEnum.DELAY:
        return 'delay';
      case StepTypeEnum.CUSTOM:
        return 'custom';
      case StepTypeEnum.HTTP_REQUEST:
        return 'http_request';
      default:
        return null;
    }
  }
}
