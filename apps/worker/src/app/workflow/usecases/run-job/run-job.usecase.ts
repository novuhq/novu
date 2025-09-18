import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  GetSubscriberSchedule,
  GetSubscriberScheduleCommand,
  getJobDigest,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
  StorageHelperService,
  WorkflowRunService,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationEntity,
  NotificationRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  Schedule,
  StepTypeEnum,
} from '@novu/shared';
import { setUser } from '@sentry/node';
import { differenceInMilliseconds } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER, PlatformException, shouldHaltOnStepFailure } from '../../../shared/utils';
import { AddJob } from '../add-job';
import { ExecuteBridgeJob, ExecuteBridgeJobCommand } from '../execute-bridge-job';
import { ProcessUnsnoozeJob, ProcessUnsnoozeJobCommand } from '../process-unsnooze-job';
import { SendMessage, SendMessageCommand } from '../send-message';
import { SendMessageStatus } from '../send-message/send-message-type.usecase';
import { SetJobAsFailedCommand } from '../update-job-status/set-job-as.command';
import { SetJobAsFailed } from '../update-job-status/set-job-as-failed.usecase';
import { RunJobCommand } from './run-job.command';
import { calculateNextAvailableTime, isWithinSchedule } from './schedule-validator';

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
    private createExecutionDetails: CreateExecutionDetails,
    private getSubscriberSchedule: GetSubscriberSchedule,
    private logger: PinoLogger,
    private subscriberRepository: SubscriberRepository,
    private featureFlagsService: FeatureFlagsService,
    private executeBridgeJob: ExecuteBridgeJob
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
    let isJobExtendedToSubscriberSchedule = false;
    let error: Error | undefined;

    try {
      const isSubscribersScheduleEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_SUBSCRIBERS_SCHEDULE_ENABLED,
        defaultValue: false,
        organization: { _id: job._organizationId },
        environment: { _id: job._environmentId },
      });

      const notification = await this.notificationRepository.findOne({
        _id: job._notificationId,
        _environmentId: job._environmentId,
      });

      if (!notification) {
        throw new PlatformException(`Notification with id ${job._notificationId} not found`);
      }

      if (isSubscribersScheduleEnabled) {
        const schedule = await this.getSubscriberSchedule.execute(
          GetSubscriberScheduleCommand.create({
            environmentId: job._environmentId,
            organizationId: job._organizationId,
            _subscriberId: job._subscriberId,
          })
        );

        const subscriber = await this.subscriberRepository.findOne(
          {
            _id: job._subscriberId,
            _environmentId: job._environmentId,
            _organizationId: job._organizationId,
          },
          'timezone',
          { readPreference: 'secondaryPreferred' }
        );
        const timezone = subscriber?.timezone;
        const isOutsideSubscriberSchedule = schedule?.isEnabled
          ? !isWithinSchedule(schedule, new Date(), timezone)
          : false;

        if (isOutsideSubscriberSchedule && (await this.shouldExtendToSubscriberSchedule(job, notification))) {
          this.logger.info(
            {
              jobId: job._id,
              subscriberId: job.subscriberId,
              stepType: job.type,
            },
            "The step was extended to the next available time in the subscriber's schedule"
          );

          isJobExtendedToSubscriberSchedule = await this.extendJobToNextAvailableSchedule(job, schedule, timezone);
          if (isJobExtendedToSubscriberSchedule) {
            shouldQueueNextJob = false;
            return;
          }
        }

        if (isOutsideSubscriberSchedule && !this.shouldSkipScheduleCheck(job, notification)) {
          this.logger.info(
            {
              jobId: job._id,
              subscriberId: job.subscriberId,
              stepType: job.type,
            },
            "The step was skipped as it fell outside the subscriber's schedule"
          );

          await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.CANCELED);

          await this.stepRunRepository.create(job, {
            status: JobStatusEnum.CANCELED,
          });

          await this.createExecutionDetails.execute(
            CreateExecutionDetailsCommand.create({
              ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
              detail: DetailEnum.SKIPPED_STEP_OUTSIDE_OF_THE_SCHEDULE,
              source: ExecutionDetailsSourceEnum.INTERNAL,
              status: ExecutionDetailsStatusEnum.SUCCESS,
              isTest: false,
              isRetry: false,
              raw: JSON.stringify({
                schedule,
                timezone,
              }),
            })
          );

          return;
        }
      }

      await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.RUNNING);

      await this.storageHelperService.getAttachments(job.payload?.attachments);

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
          contextKeys: job.contextKeys,
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
    } catch (caughtError: unknown) {
      error = caughtError as Error;
      await this.stepRunRepository.create(job, {
        status: JobStatusEnum.FAILED,
        errorCode: 'execution_error',
        errorMessage: error.message,
      });

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
      throw caughtError;
    } finally {
      if (shouldQueueNextJob && !isJobExtendedToSubscriberSchedule) {
        await this.tryQueueNextJobs(job);
      } else if (!isJobExtendedToSubscriberSchedule) {
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

        if (addJobResult.stepStatus === JobStatusEnum.SKIPPED) {
          await this.jobRepository.updateOne(
            {
              _id: nextJob._id,
              _environmentId: nextJob._environmentId,
              _organizationId: nextJob._organizationId,
            },
            { $set: { status: JobStatusEnum.SKIPPED } }
          );

          await this.stepRunRepository.create(nextJob, {
            status: JobStatusEnum.SKIPPED,
          });

          await this.createExecutionDetails.execute(
            CreateExecutionDetailsCommand.create({
              ...CreateExecutionDetailsCommand.getDetailsFromJob(nextJob),
              detail: DetailEnum.SKIPPED_STEP_BY_CONDITIONS,
              source: ExecutionDetailsSourceEnum.INTERNAL,
              status: ExecutionDetailsStatusEnum.SUCCESS,
              isTest: false,
              isRetry: false,
            })
          );

          currentJob = nextJob; // if skipped, continue to the next job
        } else {
          shouldContinueQueueNextJob = false;
        }

        if (addJobResult.workflowStatus === WorkflowRunStatusEnum.COMPLETED) {
          await this.workflowRunService.updateDeliveryLifecycle({
            notificationId: nextJob._notificationId,
            environmentId: nextJob._environmentId,
            organizationId: nextJob._organizationId,
            subscriberId: nextJob._subscriberId,
          });
        }
      } catch (error: unknown) {
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
          error as Error
        );

        if (shouldHaltOnStepFailure(nextJob) && !this.shouldBackoff(error as Error)) {
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

        if (shouldHaltOnStepFailure(nextJob) || this.shouldBackoff(error as Error)) {
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

  private assignLogger(job: JobEntity) {
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

  private shouldSkipScheduleCheck(job: JobEntity, notification: NotificationEntity): boolean {
    // always deliver in-app messages or critical messages
    // let trigger,digest and delay finish their execution
    if (
      job.type === StepTypeEnum.TRIGGER ||
      job.type === StepTypeEnum.IN_APP ||
      job.type === StepTypeEnum.DELAY ||
      job.type === StepTypeEnum.DIGEST ||
      notification.critical
    ) {
      return true;
    }

    return false;
  }

  private async shouldExtendToSubscriberSchedule(job: JobEntity, notification: NotificationEntity): Promise<boolean> {
    // should only extend to schedule for delay and digest when the workflow is not critical
    if ((job.type === StepTypeEnum.DELAY || job.type === StepTypeEnum.DIGEST) && !notification.critical) {
      const bridgeResponse = await this.executeBridgeJob.execute(
        ExecuteBridgeJobCommand.create({
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
          identifier: job.identifier,
          jobId: job._id,
          job: job,
          variables: {},
        })
      );
      const extendToSchedule = bridgeResponse?.outputs?.extendToSchedule as boolean | undefined;
      return extendToSchedule ?? false;
    }

    return false;
  }

  private async extendJobToNextAvailableSchedule(
    job: JobEntity,
    schedule?: Schedule,
    timezone?: string
  ): Promise<boolean> {
    const MAX_EXTENSIONS = 3; // maximum number of schedule extensions allowed
    const currentExtensions = job.scheduleExtensionsCount ?? 0;

    if (currentExtensions >= MAX_EXTENSIONS) {
      this.logger.warn(
        {
          jobId: job._id,
          subscriberId: job.subscriberId,
          stepType: job.type,
          extensions: currentExtensions,
        },
        'Maximum number of schedule extensions reached, sending the message'
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.SKIPPED_STEP_MAX_EXTENSIONS_REACHED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
        })
      );

      return false;
    }

    const nextAvailableTime = calculateNextAvailableTime(schedule, new Date(), timezone);
    const delayMs = Math.max(0, differenceInMilliseconds(nextAvailableTime, new Date()));

    if (delayMs === 0) {
      return false;
    }

    await this.jobRepository.updateOne(
      {
        _id: job._id,
        _environmentId: job._environmentId,
      },
      {
        $set: {
          scheduleExtensionsCount: currentExtensions + 1,
          status: JobStatusEnum.DELAYED,
        },
      }
    );

    const updatedJob = await this.jobRepository.findOne({
      _id: job._id,
      _environmentId: job._environmentId,
    });

    if (!updatedJob) {
      throw new PlatformException(`Job with id ${job._id} not found`);
    }

    await this.stepRunRepository.create(updatedJob, {
      status: JobStatusEnum.DELAYED,
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(updatedJob),
        detail: DetailEnum.STEP_EXTENDED_TO_SCHEDULE,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          delayMs,
          nextAvailableTime: timezone
            ? formatInTimeZone(nextAvailableTime, timezone, 'yyyy-MM-dd HH:mm:ss zzz')
            : nextAvailableTime.toISOString(),
          timezone,
          schedule,
          scheduleExtensionsCount: currentExtensions + 1,
          maxScheduleExtensions: MAX_EXTENSIONS,
        }),
      })
    );

    // re-queue the job with the new delay
    await this.addJobUsecase.queueJob(updatedJob, delayMs);

    this.logger.info(
      {
        jobId: updatedJob._id,
        subscriberId: updatedJob.subscriberId,
        stepType: updatedJob.type,
        delayMs,
        nextAvailableTime: nextAvailableTime.toISOString(),
        scheduleExtensionsCount: currentExtensions + 1,
        maxExtensions: MAX_EXTENSIONS,
      },
      'Step was extended to the next available time in the subscriber schedule'
    );

    return true;
  }
}
