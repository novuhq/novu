import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum, NotificationRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { setUser } from '@sentry/node';
import {
  getJobDigest,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  StorageHelperService,
} from '@novu/application-generic';

import { RunJobCommand } from './run-job.command';
import { SendMessage, SendMessageCommand } from '../send-message';
import { PlatformException, EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER, shouldHaltOnStepFailure } from '../../../shared/utils';
import { SetJobAsFailed } from '../update-job-status/set-job-as-failed.usecase';
import { AddJob } from '../add-job';
import { SetJobAsFailedCommand } from '../update-job-status/set-job-as.command';

const nr = require('newrelic');

const LOG_CONTEXT = 'RunJob';

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    private storageHelperService: StorageHelperService,
    private notificationRepository: NotificationRepository,
    private logger?: PinoLogger
  ) {}

  @InstrumentUsecase()
  public async execute(command: RunJobCommand): Promise<JobEntity | undefined> {
    setUser({
      id: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    let job = await this.jobRepository.findOne({ _id: command.jobId, _environmentId: command.environmentId });
    if (!job) {
      throw new PlatformException(`Job with id ${command.jobId} not found`);
    }

    this.assignLogger(job);

    const { canceled, activeDigestFollower } = await this.delayedEventIsCanceled(job);

    if (canceled && !activeDigestFollower) {
      Logger.verbose({ canceled }, `Job ${job._id} that had been delayed has been cancelled`, LOG_CONTEXT);

      return;
    }

    if (activeDigestFollower) {
      job = this.assignNewDigestExecutor(activeDigestFollower);
      this.assignLogger(job);
    }

    nr.addCustomAttributes({
      transactionId: job.transactionId,
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      jobId: job._id,
      jobType: job.type,
    });

    let shouldQueueNextJob = true;

    try {
      await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.RUNNING);

      await this.storageHelperService.getAttachments(job.payload?.attachments);

      const notification = await this.notificationRepository.findOne({
        _id: job._notificationId,
        _environmentId: job._environmentId,
      });

      if (!notification) {
        throw new PlatformException(`Notification with id ${job._notificationId} not found`);
      }

      const sendMessageResult = await this.sendMessage.execute(
        SendMessageCommand.create({
          identifier: job.identifier,
          payload: job.payload ?? {},
          overrides: job.overrides ?? {},
          step: job.step,
          transactionId: job.transactionId,
          notificationId: job._notificationId,
          _templateId: job._templateId,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
          subscriberId: job.subscriberId,
          // backward compatibility - ternary needed to be removed once the queue renewed
          _subscriberId: job._subscriberId ? job._subscriberId : job.subscriberId,
          jobId: job._id,
          events: job.digest?.events,
          job,
          tags: notification.tags || [],
          statelessPreferences: job.preferences,
        })
      );

      if (sendMessageResult.status === 'success') {
        await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.COMPLETED);
      }
    } catch (error: any) {
      if (shouldHaltOnStepFailure(job) && !this.shouldBackoff(error)) {
        await this.jobRepository.cancelPendingJobs({
          transactionId: job.transactionId,
          _environmentId: job._environmentId,
          _subscriberId: job._subscriberId,
          _templateId: job._templateId,
        });
      }

      if (shouldHaltOnStepFailure(job) || this.shouldBackoff(error)) {
        shouldQueueNextJob = false;
      }
      throw error;
    } finally {
      if (shouldQueueNextJob) {
        await this.tryQueueNextJobs(job);
      } else {
        // Remove the attachments if the job should not be queued
        await this.storageHelperService.deleteAttachments(job.payload?.attachments);
      }
    }
  }

  /**
   * Attempts to queue subsequent jobs in the workflow chain.
   * If queueNextJob.execute returns undefined, we stop the workflow.
   * Otherwise, we continue trying to queue the next job in the chain.
   */
  private async tryQueueNextJobs(job: JobEntity): Promise<void> {
    let currentFailedJob: JobEntity | null = job;
    let nextJob: JobEntity | null = null;
    if (!currentFailedJob) {
      return;
    }

    let shouldContinueQueueNextJob = true;

    while (shouldContinueQueueNextJob) {
      try {
        if (!currentFailedJob) {
          return;
        }

        nextJob = await this.jobRepository.findOne({
          _environmentId: currentFailedJob._environmentId,
          _parentId: currentFailedJob._id,
        });

        if (!nextJob) {
          return;
        }

        await this.addJobUsecase.execute({
          userId: nextJob._userId,
          environmentId: nextJob._environmentId,
          organizationId: nextJob._organizationId,
          jobId: nextJob._id,
          job: nextJob,
        });

        shouldContinueQueueNextJob = false;
      } catch (error: any) {
        if (!nextJob) {
          return;
        }

        await this.setJobAsFailed.execute(
          SetJobAsFailedCommand.create({
            environmentId: nextJob._environmentId,
            jobId: nextJob._id,
            organizationId: nextJob._organizationId,
            userId: nextJob._userId,
          }),
          error
        );

        if (shouldHaltOnStepFailure(nextJob) && !this.shouldBackoff(error)) {
          await this.jobRepository.cancelPendingJobs({
            transactionId: nextJob.transactionId,
            _environmentId: nextJob._environmentId,
            _subscriberId: nextJob._subscriberId,
            _templateId: nextJob._templateId,
          });
        }

        if (shouldHaltOnStepFailure(nextJob) || this.shouldBackoff(error)) {
          shouldContinueQueueNextJob = false;
          throw error;
        }

        currentFailedJob = nextJob;
      } finally {
        if (nextJob) {
          await this.storageHelperService.deleteAttachments(nextJob.payload?.attachments);
        }
      }
    }
  }

  private assignLogger(job) {
    try {
      this.logger?.assign({
        transactionId: job.transactionId,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        jobId: job._id,
        jobType: job.type,
      });
    } catch (e) {
      Logger.error(e, 'RunJob', LOG_CONTEXT);
    }
  }

  /*
   * If the following condition is met,
   * - transactions were merged to the main delayed digest.
   * - the main delayed digest was canceled.
   * that mean that we need to assign a new active digest follower job to replace it.
   * so from now on we will continue the follower transaction as main digest job.
   */
  private assignNewDigestExecutor(activeDigestFollower: JobEntity): JobEntity {
    return activeDigestFollower;
  }

  private isCanceledMainDigest(type: StepTypeEnum | undefined, status: JobStatusEnum) {
    return type === StepTypeEnum.DIGEST && status === JobStatusEnum.CANCELED;
  }

  @Instrument()
  private async delayedEventIsCanceled(
    job: JobEntity
  ): Promise<{ canceled: boolean; activeDigestFollower: JobEntity | null }> {
    let activeDigestFollower: JobEntity | null = null;

    if (job.type !== StepTypeEnum.DIGEST && job.type !== StepTypeEnum.DELAY) {
      return { canceled: false, activeDigestFollower };
    }

    const canceled = job.status === JobStatusEnum.CANCELED;

    if (job.status === JobStatusEnum.CANCELED) {
      activeDigestFollower = await this.activeDigestMainFollowerExist(job);
    }

    return { canceled, activeDigestFollower };
  }

  @Instrument()
  private async activeDigestMainFollowerExist(job: JobEntity): Promise<JobEntity | null> {
    if (job.type !== StepTypeEnum.DIGEST) {
      return null;
    }

    const { digestKey, digestValue } = getJobDigest(job);

    const jobQuery: Partial<JobEntity> & { _environmentId: string } = {
      _environmentId: job._environmentId,
      _organizationId: job._organizationId,
      _mergedDigestId: null,
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: job._subscriberId,
      _templateId: job._templateId,
    };

    if (digestKey && digestValue) {
      jobQuery[`payload.${digestKey}`] = digestValue;
    }

    return await this.jobRepository.findOne(jobQuery);
  }

  public shouldBackoff(error: Error): boolean {
    return error.message.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);
  }
}
