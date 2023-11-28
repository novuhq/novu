const nr = require('newrelic');

import { Injectable, Logger } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import {
  getJobDigest,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  StorageHelperService,
} from '@novu/application-generic';

import { RunJobCommand } from './run-job.command';
import { QueueNextJob, QueueNextJobCommand } from '../queue-next-job';
import { SendMessage, SendMessageCommand } from '../send-message';
import { PlatformException, EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/utils';

const LOG_CONTEXT = 'RunJob';

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    private queueNextJob: QueueNextJob,
    private storageHelperService: StorageHelperService,
    private logger?: PinoLogger
  ) {}

  @InstrumentUsecase()
  public async execute(command: RunJobCommand): Promise<JobEntity | undefined> {
    Sentry.setUser({
      id: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    let job = await this.jobRepository.findOne({ _id: command.jobId, _environmentId: command.environmentId });
    if (!job) throw new PlatformException(`Job with id ${command.jobId} not found`);

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

      await this.sendMessage.execute(
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
        })
      );

      await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.COMPLETED);
    } catch (error: any) {
      Logger.error({ error }, `Running job ${job._id} has thrown an error`, LOG_CONTEXT);
      if (job.step.shouldStopOnFail || this.shouldBackoff(error)) {
        shouldQueueNextJob = false;
      }
      throw new PlatformException(error.message);
    } finally {
      if (shouldQueueNextJob) {
        const newJob = await this.queueNextJob.execute(
          QueueNextJobCommand.create({
            parentId: job._id,
            environmentId: job._environmentId,
            organizationId: job._organizationId,
            userId: job._userId,
          })
        );

        // Only remove the attachments if that is the last job
        if (!newJob) {
          await this.storageHelperService.deleteAttachments(job.payload?.attachments);
        }
      } else {
        // Remove the attachments if the job should not be queued
        await this.storageHelperService.deleteAttachments(job.payload?.attachments);
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
