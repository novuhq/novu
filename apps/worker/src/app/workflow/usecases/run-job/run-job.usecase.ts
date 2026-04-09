import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  GetSubscriberSchedule,
  GetSubscriberScheduleCommand,
  getJobDigest,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
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
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
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
import { PartialNotificationEntity } from '../add-job/add-job.command';
import { ExecuteBridgeJob, ExecuteBridgeJobCommand } from '../execute-bridge-job';
import { ProcessUnsnoozeJob, ProcessUnsnoozeJobCommand } from '../process-unsnooze-job';
import { SendMessage, SendMessageCommand } from '../send-message';
import { SendMessageStatus } from '../send-message/send-message-type.usecase';
import { SetJobAsFailedCommand } from '../update-job-status/set-job-as.command';
import { SetJobAsFailed } from '../update-job-status/set-job-as-failed.usecase';
import { RunJobCommand } from './run-job.command';
import { calculateNextAvailableTime, isWithinSchedule } from './schedule-validator';

const nr = require('newrelic');

type SelectedWorkflowFields = Pick<NotificationTemplateEntity, 'steps'>;

const SELECTED_WORKFLOW_FIELDS_PROJECTION: Record<keyof SelectedWorkflowFields, 1> = {
  steps: 1,
} as const;

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    private storageHelperService: StorageHelperService,
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processUnsnoozeJob: ProcessUnsnoozeJob,
    private stepRunRepository: StepRunRepository,
    private workflowRunService: WorkflowRunService,
    private createExecutionDetails: CreateExecutionDetails,
    private getSubscriberSchedule: GetSubscriberSchedule,
    private logger: PinoLogger,
    private subscriberRepository: SubscriberRepository,
    private featureFlagsService: FeatureFlagsService,
    private executeBridgeJob: ExecuteBridgeJob,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
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
      this.logger.trace({ nv: { canceled } }, `Job ${job._id} that had been delayed has been cancelled`);
      await this.stepRunRepository.create(job, {
        status: JobStatusEnum.CANCELED,
      });

      // Update workflow run delivery lifecycle after job cancellation
      await this.conditionallyUpdateDeliveryLifecycle(job, WorkflowRunStatusEnum.COMPLETED, undefined, null);

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
    let notification: PartialNotificationEntity | null = null;

    try {
      notification = await this.notificationRepository.findOne(
        {
          _id: job._notificationId,
          _environmentId: job._environmentId,
        },
        {
          _id: 1,
          _templateId: 1,
          _organizationId: 1,
          _environmentId: 1,
          _subscriberId: 1,
          transactionId: 1,
          channels: 1,
          to: 1,
          payload: 1,
          controls: 1,
          topics: 1,
          _digestedNotificationId: 1,
          createdAt: 1,
          severity: 1,
          critical: 1,
          contextKeys: 1,
          tags: 1,
        }
      );

      if (!notification) {
        throw new PlatformException(`Notification with id ${job._notificationId} not found`);
      }

      const workflow = await this.getWorkflow(
        job._templateId,
        job._environmentId,
        job._organizationId,
        job.payload?.__source
      );

      const schedule = await this.getSubscriberSchedule.execute(
        GetSubscriberScheduleCommand.create({
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          _subscriberId: job._subscriberId,
          contextKeys: job.contextKeys,
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

      if (
        isOutsideSubscriberSchedule &&
        (await this.shouldExtendToSubscriberSchedule(job, notification.critical ?? false, workflow))
      ) {
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

      if (isOutsideSubscriberSchedule && !this.shouldSkipScheduleCheck(job, notification.critical)) {
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

        // Update delivery lifecycle only — use PROCESSING so the workflow status trace
        // is not emitted here. tryQueueNextJobs handles the single COMPLETED emission.
        await this.conditionallyUpdateDeliveryLifecycle(job, WorkflowRunStatusEnum.PROCESSING, workflow, notification);

        return;
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
          contextKeys: job.contextKeys || [],
          workflow,
        })
      );

      // while we sending a message the job can me updated, like in digest case, therefore we want to have the most updated job
      job = sendMessageResult.job ?? job;

      if (sendMessageResult.status === 'success') {
        await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.COMPLETED);

        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.COMPLETED,
        });

        // Update workflow run delivery lifecycle after successful step completion
        await this.conditionallyUpdateDeliveryLifecycle(job, WorkflowRunStatusEnum.PROCESSING, workflow, notification);
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

        // Update delivery lifecycle only — use PROCESSING so the workflow status trace
        // is not emitted here. The finally block handles the single COMPLETED emission.
        await this.conditionallyUpdateDeliveryLifecycle(job, WorkflowRunStatusEnum.PROCESSING, workflow, notification);

        if (shouldHaltOnStepFailure(job) || sendMessageResult.shouldHalt) {
          shouldQueueNextJob = false;
          try {
            const cancelledJobs = await this.jobRepository.cancelPendingJobs({
              transactionId: job.transactionId,
              _environmentId: job._environmentId,
              _subscriberId: job._subscriberId,
              _templateId: job._templateId,
            });

            if (cancelledJobs.length > 0) {
              await this.stepRunRepository.createMany(cancelledJobs, { status: JobStatusEnum.CANCELED });
              await this.createCanceledExecutionDetails(cancelledJobs);
            }
          } catch (cancellationError: unknown) {
            this.logger.error(
              { err: cancellationError, nv: { jobId: job._id, transactionId: job.transactionId } },
              'Failed to cancel pending jobs after step failure'
            );
          }
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

        // Update workflow run delivery lifecycle after step skip/cancellation
        await this.conditionallyUpdateDeliveryLifecycle(job, WorkflowRunStatusEnum.PROCESSING, workflow, notification);
      }
    } catch (caughtError: unknown) {
      error = caughtError as Error;
      await this.stepRunRepository.create(job, {
        status: JobStatusEnum.FAILED,
        errorCode: 'execution_error',
        errorMessage: error.message,
      });

      if (shouldHaltOnStepFailure(job) && !this.shouldBackoff(error)) {
        try {
          const cancelledJobs = await this.jobRepository.cancelPendingJobs({
            transactionId: job.transactionId,
            _environmentId: job._environmentId,
            _subscriberId: job._subscriberId,
            _templateId: job._templateId,
          });

          if (cancelledJobs.length > 0) {
            await this.stepRunRepository.createMany(cancelledJobs, { status: JobStatusEnum.CANCELED });
            await this.createCanceledExecutionDetails(cancelledJobs);
          }
        } catch (cancellationError: unknown) {
          this.logger.error(
            { err: cancellationError, nv: { jobId: job._id, transactionId: job.transactionId } },
            'Failed to cancel pending jobs after step execution error'
          );
        }
      }

      if (shouldHaltOnStepFailure(job) || this.shouldBackoff(error)) {
        shouldQueueNextJob = false;
      }
      throw caughtError;
    } finally {
      if (shouldQueueNextJob && !isJobExtendedToSubscriberSchedule) {
        await this.tryQueueNextJobs(job, notification, !!error);
      } else if (!isJobExtendedToSubscriberSchedule && !error) {
        // Update workflow run status based on step runs when halting on step failure.
        // Skip when an unexpected exception was thrown — the Bull worker's setJobAsFailed
        // will handle the final status to avoid duplicate traces.
        await this.workflowRunService.updateDeliveryLifecycle({
          workflowStatus: WorkflowRunStatusEnum.COMPLETED,
          notificationId: job._notificationId,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          _subscriberId: job._subscriberId,
          notification,
          currentJob: { type: job.type, _id: job._id },
        });
        // Remove the attachments if the job should not be queued
        await this.storageHelperService.deleteAttachments(job.payload?.attachments);
      }
    }
  }

  @Instrument()
  private async getWorkflow(
    templateId: string,
    environmentId: string,
    organizationId: string,
    source?: string
  ): Promise<NotificationTemplateEntity> {
    const workflow = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.WORKFLOW,
      `${environmentId}:${templateId}`,
      async () => {
        const result = await this.notificationTemplateRepository.findById(templateId, environmentId);

        return result;
      },
      {
        environmentId,
        organizationId,
        skipCache: !!source,
      }
    );

    if (!workflow) {
      throw new NotFoundException(`Workflow ${templateId} not found`);
    }

    return workflow;
  }

  private isUnsnoozeJob(job: JobEntity) {
    return job.type === StepTypeEnum.IN_APP && job.delay && job.payload?.unsnooze;
  }

  /**
   * Attempts to queue subsequent jobs in the workflow chain.
   * If queueNextJob.execute returns undefined, we stop the workflow.
   * Otherwise, we continue trying to queue the next job in the chain.
   *
   * @param hasCurrentJobError - If true, the current job failed with an error. When the workflow
   *   ends (no next job), we skip creating the status trace here and let setJobAsFailed handle it
   *   to avoid duplicate traces and ensure correct error status.
   */
  private async tryQueueNextJobs(
    job: JobEntity,
    notification?: PartialNotificationEntity | null,
    hasCurrentJobError = false
  ): Promise<void> {
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
          if (!hasCurrentJobError) {
            // Update workflow run status when there is no next job (workflow complete successfully)
            await this.workflowRunService.updateDeliveryLifecycle({
              workflowStatus: WorkflowRunStatusEnum.COMPLETED,
              notificationId: currentJob._notificationId,
              environmentId: currentJob._environmentId,
              organizationId: currentJob._organizationId,
              _subscriberId: currentJob._subscriberId,
              notification,
              currentJob: { type: currentJob.type, _id: currentJob._id },
            });
          }

          return;
        }

        const addJobResult = await this.addJobUsecase.execute({
          userId: nextJob._userId,
          environmentId: nextJob._environmentId,
          organizationId: nextJob._organizationId,
          jobId: nextJob._id,
          job: nextJob,
          notification,
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

          // Update workflow run delivery lifecycle after step skip
          await this.conditionallyUpdateDeliveryLifecycle(
            nextJob,
            WorkflowRunStatusEnum.PROCESSING,
            undefined,
            notification
          );

          currentJob = nextJob; // if skipped, continue to the next job
        } else {
          shouldContinueQueueNextJob = false;
        }

        if (addJobResult.workflowStatus === WorkflowRunStatusEnum.COMPLETED) {
          await this.workflowRunService.updateDeliveryLifecycle({
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            notificationId: nextJob._notificationId,
            environmentId: nextJob._environmentId,
            organizationId: nextJob._organizationId,
            _subscriberId: nextJob._subscriberId,
            notification,
            currentJob: { type: nextJob.type, _id: nextJob._id },
          });
        }
      } catch (error: unknown) {
        if (!nextJob) {
          // Fallback: update workflow run status if nextJob is unexpectedly missing
          // (should not occur due to prior nextJob check in loop)
          await this.workflowRunService.updateDeliveryLifecycle({
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            notificationId: currentJob._notificationId,
            environmentId: currentJob._environmentId,
            organizationId: currentJob._organizationId,
            _subscriberId: currentJob._subscriberId,
            notification,
            currentJob: { type: currentJob.type, _id: currentJob._id },
          });

          return;
        }

        const jobAfterNext: Pick<JobEntity, '_id'> | null = await this.jobRepository.findOne(
          {
            _environmentId: nextJob._environmentId,
            _parentId: nextJob._id,
          },
          '_id'
        );

        const isHaltingWorkflow = shouldHaltOnStepFailure(nextJob) && !this.shouldBackoff(error as Error);
        const isLastJobFailed = !jobAfterNext || isHaltingWorkflow;

        await this.setJobAsFailed.execute(
          SetJobAsFailedCommand.create({
            environmentId: nextJob._environmentId,
            jobId: nextJob._id,
            organizationId: nextJob._organizationId,
            userId: nextJob._userId,
            isLastJobFailed,
          }),
          error as Error
        );

        if (isHaltingWorkflow) {
          try {
            const cancelledJobs = await this.jobRepository.cancelPendingJobs({
              transactionId: nextJob.transactionId,
              _environmentId: nextJob._environmentId,
              _subscriberId: nextJob._subscriberId,
              _templateId: nextJob._templateId,
            });

            if (cancelledJobs.length > 0) {
              await this.stepRunRepository.createMany(cancelledJobs, { status: JobStatusEnum.CANCELED });
              await this.createCanceledExecutionDetails(cancelledJobs);
            }
          } catch (cancellationError: unknown) {
            this.logger.error(
              { err: cancellationError, nv: { jobId: nextJob._id, transactionId: nextJob.transactionId } },
              'Failed to cancel pending jobs after next job failure'
            );
          }
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

  private async createCanceledExecutionDetails(cancelledJobs: JobEntity[]): Promise<void> {
    for (const cancelledJob of cancelledJobs) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(cancelledJob),
          detail: DetailEnum.STEP_CANCELED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );
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
      this.logger.error({ err: e }, 'Failed to assign logger');
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

    if (job.type !== StepTypeEnum.DIGEST && job.type !== StepTypeEnum.DELAY && job.type !== StepTypeEnum.THROTTLE) {
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

  /**
   * Checks if there are any remaining action steps (delay, digest, throttle) in the workflow
   * we skip updating the delivery lifecycle to avoid unnecessary calculations for workflows that will complete quickly and update only the last step.
   */
  private async hasRemainingActionSteps(job: JobEntity, workflow: SelectedWorkflowFields): Promise<boolean> {
    if (!workflow || !workflow.steps) {
      return false;
    }

    // Find the current step index in the workflow
    const currentStepIndex = workflow.steps.findIndex((step) => step._id === job.step?._id);

    if (currentStepIndex === -1) {
      return false;
    }

    // Check if any remaining steps after the current one are action steps
    const remainingSteps = workflow.steps.slice(currentStepIndex + 1);

    return remainingSteps.some((step) => {
      // Check if step has a template with action step type
      if (step.template?.type) {
        return (
          step.template.type === StepTypeEnum.CUSTOM ||
          step.template.type === StepTypeEnum.HTTP_REQUEST ||
          step.template.type === StepTypeEnum.DELAY ||
          step.template.type === StepTypeEnum.DIGEST ||
          step.template.type === StepTypeEnum.THROTTLE
        );
      }
      return false;
    });
  }

  /**
   * Checks if the current job step is the last step in the workflow
   */
  private async isLastStepInWorkflow(job: JobEntity, workflow: SelectedWorkflowFields): Promise<boolean> {
    if (!workflow || !workflow.steps) {
      return false;
    }

    // Find the current step index in the workflow
    const currentStepIndex = workflow.steps.findIndex((step) => step._id === job.step?._id);

    if (currentStepIndex === -1) {
      return false;
    }

    // Check if this is the last step in the workflow
    return currentStepIndex === workflow.steps.length - 1;
  }

  /**
   * Conditionally updates the delivery lifecycle based on workflow state and feature flags.
   *
   * When IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED is ON:
   * - Optimizes by skipping updates when there are no remaining action steps (delay, digest, etc.)
   * - Also skips for the last step since finalization handles it via state machine transitions
   * - The transition-based approach correctly handles "all at once" finalization scenarios
   *
   * When IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED is OFF:
   * - Always calls updateDeliveryLifecycle for channel steps
   * - The legacy shouldCreateTrace logic requires incremental calls to work correctly
   *   (it checks for length === 1 to prevent duplicates)
   */
  private async conditionallyUpdateDeliveryLifecycle(
    job: JobEntity,
    workflowStatus: WorkflowRunStatusEnum,
    workflow?: NotificationTemplateEntity,
    notification?: PartialNotificationEntity | null
  ): Promise<void> {
    this.logger.debug({ nv: { job } }, 'Conditionally updating delivery lifecycle');

    if (
      job.type === StepTypeEnum.TRIGGER ||
      job.type === StepTypeEnum.DELAY ||
      job.type === StepTypeEnum.DIGEST ||
      job.type === StepTypeEnum.CUSTOM ||
      job.type === StepTypeEnum.THROTTLE
    ) {
      return;
    }

    const isTransitionEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED,
      organization: { _id: job._organizationId },
      environment: { _id: job._environmentId },
      defaultValue: false,
    });

    if (isTransitionEnabled) {
      const workflowWithSteps: SelectedWorkflowFields | null =
        workflow ??
        (await this.notificationTemplateRepository.findOne(
          {
            _id: job._templateId,
            _environmentId: job._environmentId,
          },
          SELECTED_WORKFLOW_FIELDS_PROJECTION
        ));

      if (!workflowWithSteps || !workflowWithSteps.steps) {
        return;
      }

      const isLastStep = await this.isLastStepInWorkflow(job, workflowWithSteps);
      if (isLastStep) {
        this.logger.trace(
          { nv: { jobId: job._id, stepId: job.step?._id } },
          'Skipping delivery lifecycle update for last step in workflow (transition enabled)'
        );

        return;
      }

      const hasActionSteps = await this.hasRemainingActionSteps(job, workflowWithSteps);

      if (!hasActionSteps) {
        this.logger.trace(
          { nv: { jobId: job._id, stepId: job.step?._id } },
          'Skipping delivery lifecycle update - no remaining action steps (transition enabled)'
        );

        return;
      }
    }

    await this.workflowRunService.updateDeliveryLifecycle({
      workflowStatus,
      notificationId: job._notificationId,
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      _subscriberId: job._subscriberId,
      notification,
      currentJob: { type: job.type, _id: job._id },
    });
  }

  private shouldSkipScheduleCheck(job: JobEntity, critical: boolean | undefined): boolean {
    // always deliver in-app messages or critical messages
    // let trigger, digest, delay and http-request finish their execution
    if (
      job.type === StepTypeEnum.TRIGGER ||
      job.type === StepTypeEnum.IN_APP ||
      job.type === StepTypeEnum.DELAY ||
      job.type === StepTypeEnum.DIGEST ||
      job.type === StepTypeEnum.HTTP_REQUEST ||
      critical
    ) {
      return true;
    }

    return false;
  }

  private async shouldExtendToSubscriberSchedule(
    job: JobEntity,
    critical: boolean,
    workflow?: NotificationTemplateEntity
  ): Promise<boolean> {
    // should only extend to schedule for delay and digest when the workflow is not critical
    if ((job.type === StepTypeEnum.DELAY || job.type === StepTypeEnum.DIGEST) && !critical) {
      const bridgeResponse = await this.executeBridgeJob.execute(
        ExecuteBridgeJobCommand.create({
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
          identifier: job.identifier,
          jobId: job._id,
          job: job,
          variables: {},
          workflow,
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
    await this.addJobUsecase.queueJob({
      job: updatedJob,
      delay: delayMs,
      untilDate: nextAvailableTime,
      timezone,
    });

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
