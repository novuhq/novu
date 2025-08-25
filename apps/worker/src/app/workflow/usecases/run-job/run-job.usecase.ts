import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  getJobDigest,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
  StorageHelperService,
  WorkflowRunService,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, NotificationRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { setUser } from '@sentry/node';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER, PlatformException, shouldHaltOnStepFailure } from '../../../shared/utils';
import { AddJob } from '../add-job';
import { ProcessUnsnoozeJob, ProcessUnsnoozeJobCommand } from '../process-unsnooze-job';
import { SendMessage, SendMessageCommand } from '../send-message';
import { SendMessageStatus } from '../send-message/send-message-type.usecase';
import { SetJobAsFailedCommand } from '../update-job-status/set-job-as.command';
import { SetJobAsFailed } from '../update-job-status/set-job-as-failed.usecase';
import { RunJobCommand } from './run-job.command';

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
    private processUnsnoozeJob: ProcessUnsnoozeJob,
    private stepRunRepository: StepRunRepository,
    private workflowRunService: WorkflowRunService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

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

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.RUNNING,
    });

    this.assignLogger(job);

    const { canceled, activeDigestFollower } = await this.delayedEventIsCanceled(job);

    if (canceled && !activeDigestFollower) {
      Logger.verbose({ canceled }, `Job ${job._id} that had been delayed has been cancelled`, LOG_CONTEXT);
      await this.stepRunRepository.create(job, {
        status: JobStatusEnum.CANCELED,
      });

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
    let error: any;

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

      if (this.isUnsnoozeJob(job)) {
        await this.processUnsnoozeJob.execute(
          ProcessUnsnoozeJobCommand.create({
            jobId: job._id,
            environmentId: job._environmentId,
            organizationId: job._organizationId,
          })
        );

        return;
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
          severity: notification.severity,
          statelessPreferences: job.preferences,
        })
      );

      // while we sending a message the job can me updated, like in digest case, therefore we want to have the most updated job
      job = sendMessageResult.job ?? job;

      if (sendMessageResult.status === 'success') {
        await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.COMPLETED);

        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.COMPLETED,
        });
      } else if (sendMessageResult.status === 'failed') {
        await this.jobRepository.update(
          {
            _environmentId: job._environmentId,
            _id: job._id,
          },
          {
            $set: {
              status: JobStatusEnum.FAILED,
              error: sendMessageResult.errorMessage,
            },
          }
        );

        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.FAILED,
          errorCode: 'send_message_failed',
          errorMessage: sendMessageResult.errorMessage,
        });

        if (shouldHaltOnStepFailure(job)) {
          shouldQueueNextJob = false;
          await this.jobRepository.cancelPendingJobs({
            transactionId: job.transactionId,
            _environmentId: job._environmentId,
            _subscriberId: job._subscriberId,
            _templateId: job._templateId,
          });
        }
      } else if (sendMessageResult.status === SendMessageStatus.SKIPPED) {
        await this.jobRepository.updateStatus(
          job._environmentId,
          job._id,
          JobStatusEnum.CANCELED,
          sendMessageResult.deliveryLifecycleState
        );
        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.CANCELED,
        });
      }
    } catch (caughtError: any) {
      error = caughtError;
      await this.stepRunRepository.create(job, {
        status: JobStatusEnum.FAILED,
        errorCode: 'execution_error',
        errorMessage: caughtError.message,
      });

      if (shouldHaltOnStepFailure(job) && !this.shouldBackoff(caughtError)) {
        await this.jobRepository.cancelPendingJobs({
          transactionId: job.transactionId,
          _environmentId: job._environmentId,
          _subscriberId: job._subscriberId,
          _templateId: job._templateId,
        });
      }

      if (shouldHaltOnStepFailure(job) || this.shouldBackoff(caughtError)) {
        shouldQueueNextJob = false;
      }
      throw caughtError;
    } finally {
      if (shouldQueueNextJob) {
        await this.tryQueueNextJobs(job);
      } else {
        // Update workflow run status based on step runs when halting on step failure
        await this.workflowRunService.updateDeliveryLifecycle({
          notificationId: job._notificationId,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          subscriberId: job._subscriberId,
          error: error,
        });
        // Remove the attachments if the job should not be queued
        await this.storageHelperService.deleteAttachments(job.payload?.attachments);
      }
    }
  }

  private isUnsnoozeJob(job: JobEntity) {
    return job.type === StepTypeEnum.IN_APP && job.delay && job.payload?.unsnooze;
  }

  /**
   * Attempts to queue subsequent jobs in the workflow chain.
   * If queueNextJob.execute returns undefined, we stop the workflow.
   * Otherwise, we continue trying to queue the next job in the chain.
   */
  private async tryQueueNextJobs(job: JobEntity): Promise<void> {
    let currentJob: JobEntity | null = job;
    let nextJob: JobEntity | null = null;
    if (!currentJob) {
      return;
    }

    let shouldContinueQueueNextJob = true;

    while (shouldContinueQueueNextJob) {
      try {
        if (!currentJob) {
          return;
        }

        nextJob = await this.jobRepository.findOne({
          _environmentId: currentJob._environmentId,
          _parentId: currentJob._id,
        });

        if (!nextJob) {
          // Update workflow run status when there is no next job (workflow complete)
          await this.workflowRunService.updateDeliveryLifecycle({
            notificationId: currentJob._notificationId,
            environmentId: currentJob._environmentId,
            organizationId: currentJob._organizationId,
            subscriberId: currentJob._subscriberId,
          });
          return;
        }

        const addJobResult = await this.addJobUsecase.execute({
          userId: nextJob._userId,
          environmentId: nextJob._environmentId,
          organizationId: nextJob._organizationId,
          jobId: nextJob._id,
          job: nextJob,
        });

        shouldContinueQueueNextJob = false;

        if (addJobResult.workflowStatus === WorkflowRunStatusEnum.COMPLETED) {
          await this.workflowRunService.updateDeliveryLifecycle({
            notificationId: nextJob._notificationId,
            environmentId: nextJob._environmentId,
            organizationId: nextJob._organizationId,
            subscriberId: nextJob._subscriberId,
          });
        }
      } catch (error: any) {
        if (!nextJob) {
          // Fallback: update workflow run status if nextJob is unexpectedly missing
          // (should not occur due to prior nextJob check in loop)
          await this.workflowRunService.updateDeliveryLifecycle({
            notificationId: currentJob._notificationId,
            environmentId: currentJob._environmentId,
            organizationId: currentJob._organizationId,
            subscriberId: currentJob._subscriberId,
          });
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
          // Update workflow run status based on step runs when halting on step failure
          await this.workflowRunService.updateDeliveryLifecycle({
            notificationId: nextJob._notificationId,
            environmentId: nextJob._environmentId,
            organizationId: nextJob._organizationId,
            subscriberId: nextJob._subscriberId,
            error: error,
          });
          await this.jobRepository.cancelPendingJobs({
            transactionId: nextJob.transactionId,
            _environmentId: nextJob._environmentId,
            _subscriberId: nextJob._subscriberId,
            _templateId: nextJob._templateId,
          });
        }

        if (shouldHaltOnStepFailure(nextJob) || this.shouldBackoff(error)) {
          return;
        }

        currentJob = nextJob;
      } finally {
        if (nextJob) {
          await this.storageHelperService.deleteAttachments(nextJob.payload?.attachments);
        }
      }
    }
  }

  private assignLogger(job) {
    try {
      if (this.logger) {
        this.logger.assign({
          transactionId: job.transactionId,
          jobId: job._id,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
        });
      }
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
    return error?.message?.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);
  }
}
