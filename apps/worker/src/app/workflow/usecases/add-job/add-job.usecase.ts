import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ComputeJobWaitDurationService,
  ConditionsFilter,
  ConditionsFilterCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  DurationUtils,
  getDigestType,
  getNestedValue,
  IFilterVariables,
  InstrumentUsecase,
  isDynamicOutput,
  isLookBackDigestOutput,
  isRegularOutput,
  isTimedOutput,
  JobsOptions,
  LogDecorator,
  NormalizeVariables,
  NormalizeVariablesCommand,
  PinoLogger,
  RedisThrottleService,
  StandardQueueService,
  StepRunRepository,
  StepRunStatus,
  TierRestrictionsValidateCommand,
  TierRestrictionsValidateUsecase,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationRepository,
  NotificationTemplateEntity,
  SubscriberRepository,
  TopicPreferenceEvaluation,
} from '@novu/dal';
import { DelayOutput, DigestOutput, ExecuteOutput } from '@novu/framework/internal';
import {
  castUnitToDigestUnitEnum,
  DelayTypeEnum,
  DeliveryLifecycleStatusEnum,
  DigestCreationResultEnum,
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDelayDynamicMetadata,
  IDelayRegularMetadata,
  IDelayTimedMetadata,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
  StepTypeEnum,
} from '@novu/shared';
import { parseExpression as parseCronExpression } from 'cron-parser';
import { differenceInMilliseconds } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import _ from 'lodash';
import { ExecuteBridgeJob, ExecuteBridgeJobCommand } from '../execute-bridge-job';
import { AddJobCommand } from './add-job.command';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';
import { validateDigest } from './validation';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

/*
 * @description: This is the result of the add job usecase
 *
 * Returns undefined when the end result is not determined yet
 */
type AddJobResult = {
  workflowStatus: WorkflowRunStatusEnum | null;
  deliveryLifecycleStatus: DeliveryLifecycleStatusEnum | null;
  stepStatus?: StepRunStatus;
};

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    @Inject(forwardRef(() => CreateExecutionDetails))
    private createExecutionDetails: CreateExecutionDetails,
    private mergeOrCreateDigestUsecase: MergeOrCreateDigest,
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
    @Inject(forwardRef(() => ConditionsFilter))
    private conditionsFilter: ConditionsFilter,
    private normalizeVariablesUsecase: NormalizeVariables,
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private executeBridgeJob: ExecuteBridgeJob,
    private stepRunRepository: StepRunRepository,
    private subscriberRepository: SubscriberRepository,
    private redisThrottleService: RedisThrottleService,
    private notificationRepository: NotificationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<AddJobResult> {
    this.logger.trace('Getting Job');
    const { job } = command;
    this.logger.debug(`Job contents for job ${job._id}`, job);

    if (!job) {
      this.logger.warn(`Job was null in both the input and search`);

      return {
        workflowStatus: null,
        deliveryLifecycleStatus: null,
      };
    }

    if (job.type === StepTypeEnum.TRIGGER) {
      this.logger.debug(`Scheduling New Job ${job._id} of type: ${job.type}`);
    } else {
      this.logger.info(`Scheduling New Job ${job._id} of type: ${job.type}`);
    }

    const notification =
      command.notification ??
      (await this.notificationRepository.findOne({
        _id: job._notificationId,
        _environmentId: job._environmentId,
      }));

    const topicsContext =
      notification?.topics && notification.topics.length > 0
        ? this.formatTopicsContextForExecution(notification.topics)
        : undefined;

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: topicsContext ? JSON.stringify(topicsContext) : undefined,
      })
    );

    if (topicsContext && job.type === StepTypeEnum.TRIGGER) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.TOPIC_SUBSCRIPTION_PREFERENCE_EVALUATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(topicsContext),
        })
      );
    }

    const result = isJobDeferredType(job.type)
      ? await this.executeDeferredJob(command)
      : await this.executeNoneDeferredJob(command);

    return result;
  }

  private formatTopicsContextForExecution(
    topics: Array<{ _topicId: string; topicKey: string; preferenceEvaluation?: TopicPreferenceEvaluation }>
  ) {
    return {
      topics: topics.map((topic) => ({
        topic: topic.topicKey,
        preferenceEvaluation: topic.preferenceEvaluation
          ? {
              result: topic.preferenceEvaluation.result,
              subscriptionIdentifier: topic.preferenceEvaluation.subscriptionIdentifier,
              ...(topic.preferenceEvaluation.condition && {
                condition: topic.preferenceEvaluation.condition,
              }),
            }
          : undefined,
      })),
    };
  }

  private async executeDeferredJob(command: AddJobCommand): Promise<AddJobResult> {
    const { job } = command;

    let digestAmount: number | undefined;
    let delayAmount: number | undefined;

    const variables = await this.normalizeVariablesUsecase.execute(
      NormalizeVariablesCommand.create({
        filters: command.job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: job.step,
        job,
      })
    );

    const shouldRun = await this.conditionsFilter.filter(
      ConditionsFilterCommand.create({
        filters: job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: job.step,
        job,
        variables,
      })
    );

    const filterVariables = shouldRun.variables;
    const filtered = !shouldRun.passed;
    const bridgeResponse = await this.fetchBridgeData(command, filterVariables);

    if (filtered || bridgeResponse?.options?.skip) {
      return {
        workflowStatus: null,
        deliveryLifecycleStatus: null,
        stepStatus: JobStatusEnum.SKIPPED,
      };
    }

    let digestResult: {
      digestAmount: number;
      digestCreationResult: DigestCreationResultEnum;
      cronExpression?: string;
    } | null = null;

    const subscriber = await this.subscriberRepository.findOne(
      {
        _id: job._subscriberId,
        _environmentId: job._environmentId,
      },
      'timezone',
      { readPreference: 'secondaryPreferred' }
    );
    const bridgeDelayAmountDate = this.getBridgeNextCronDate(bridgeResponse, subscriber?.timezone);
    const bridgeDelayAmount = bridgeDelayAmountDate
      ? differenceInMilliseconds(bridgeDelayAmountDate, new Date())
      : undefined;

    if (job.type === StepTypeEnum.DIGEST) {
      digestResult = await this.handleDigest({
        command,
        job,
        bridgeResponse,
        bridgeDelayAmountDate,
        bridgeDelayAmount,
        timezone: subscriber?.timezone,
      });

      if (isShouldHaltJobExecution(digestResult.digestCreationResult)) {
        if (digestResult.digestCreationResult === DigestCreationResultEnum.MERGED) {
          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.MERGED,
          };
        }

        if (digestResult.digestCreationResult === DigestCreationResultEnum.SKIPPED) {
          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.SKIPPED,
          };
        }
      }

      digestAmount = digestResult.digestAmount;
    }

    if (job.type === StepTypeEnum.THROTTLE) {
      try {
        const throttleResult = await this.handleThrottle(command, job, bridgeResponse);

        if (throttleResult.shouldSkip) {
          await this.handleThrottleSkip(
            command,
            job,
            throttleResult as { shouldSkip: boolean; executionCount: number; threshold: number; throttledUntil: string }
          );

          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.SKIPPED,
          };
        }
      } catch (error) {
        return await this.handleStepValidationError(
          command,
          job,
          error,
          StepTypeEnum.THROTTLE,
          DetailEnum.DELAY_MISCONFIGURATION
        );
      }
    }

    if (job.type === StepTypeEnum.DELAY) {
      try {
        delayAmount = await this.handleDelay({
          command,
          job,
          bridgeResponse,
          bridgeDelayAmountDate,
          bridgeDelayAmount,
          timezone: subscriber?.timezone,
        });

        if (delayAmount === undefined) {
          this.logger.warn(`Delay Amount does not exist on a delay job ${job._id}`);

          return {
            workflowStatus: null,
            deliveryLifecycleStatus: null,
          };
        }
      } catch (error) {
        return await this.handleStepValidationError(
          command,
          job,
          error,
          StepTypeEnum.DELAY,
          DetailEnum.DELAY_MISCONFIGURATION
        );
      }
    }

    if ((digestAmount || delayAmount) && filtered) {
      this.logger.trace(`Delay for job ${job._id} will be 0 because job was filtered`);
    }

    const delay = this.getExecutionDelayAmount(filtered, digestAmount, delayAmount);

    const valid = await this.validateDeferDuration(delay, job, command, digestResult?.cronExpression);

    if (!valid) {
      throw new Error('Defer duration limit exceeded');
    }

    const updatedJob = await this.jobRepository.findOne({
      _id: job._id,
      _environmentId: job._environmentId,
    });

    if (!updatedJob) {
      throw new Error(`Job with id ${job._id} not found`);
    }

    await this.stepRunRepository.create(updatedJob, {
      status: JobStatusEnum.DELAYED,
    });

    await this.queueJob({ job, delay, untilDate: bridgeDelayAmountDate, timezone: subscriber?.timezone });

    return {
      workflowStatus: null,
      deliveryLifecycleStatus: null,
    };
  }

  private async validateDeferDuration(
    delay: number,
    job: JobEntity,
    command: AddJobCommand,
    cronExpression?: string
  ): Promise<boolean> {
    const errors = await this.tierRestrictionsValidateUsecase.execute(
      TierRestrictionsValidateCommand.create({
        deferDurationMs: delay,
        stepType: job.type,
        organizationId: command.organizationId,
        cron: cronExpression,
      })
    );

    if (errors.length > 0) {
      const uniqueErrors = _.uniq(errors.map((error) => error.message));
      this.logger.warn({ errors, jobId: job._id }, uniqueErrors?.toString());

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.DEFER_DURATION_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ errors: uniqueErrors }),
        })
      );

      return false;
    }

    return true;
  }

  private async executeNoneDeferredJob(command: AddJobCommand): Promise<AddJobResult> {
    const { job } = command;

    this.logger.trace(`Updating status to queued for job ${job._id}`);
    await this.jobRepository.updateStatus(command.environmentId, job._id, JobStatusEnum.QUEUED);

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.QUEUED,
    });

    await this.queueJob({ job, delay: 0, untilDate: null });

    return {
      workflowStatus: null,
      deliveryLifecycleStatus: null,
    };
  }

  private async handleDelay({
    command,
    job,
    bridgeResponse,
    bridgeDelayAmountDate,
    bridgeDelayAmount,
    timezone,
  }: {
    command: AddJobCommand;
    job: JobEntity;
    bridgeResponse: ExecuteOutput | null;
    bridgeDelayAmountDate: Date | null;
    bridgeDelayAmount: number | undefined;
    timezone: string | undefined;
  }) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      // Assign V2 metadata from Bridge response
      metadata = await this.updateMetadata(bridgeResponse, command, bridgeDelayAmountDate);
    } else {
      // Assign V1 metadata from known values
      metadata = command.job.step.metadata as IWorkflowStepMetadata;
    }

    const delayAmount =
      bridgeDelayAmount ??
      (await this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: metadata,
        payload: job.payload,
        overrides: job.overrides,
        timezone,
      }));

    const delayType = 'type' in metadata ? metadata.type : null;
    if (delayType === DelayTypeEnum.DYNAMIC) {
      await this.validateDynamicDuration(command, job, delayAmount, StepTypeEnum.DELAY);
    }

    await this.jobRepository.updateStatus(command.environmentId, job._id, JobStatusEnum.DELAYED);

    this.logger.debug(`Delay step Amount is: ${delayAmount}`);

    return delayAmount;
  }

  private async validateDynamicDuration(
    command: AddJobCommand,
    job: JobEntity,
    durationMs: number,
    stepType: StepTypeEnum.DELAY | StepTypeEnum.THROTTLE
  ): Promise<void> {
    const stepTypeName = stepType === StepTypeEnum.DELAY ? 'delay' : 'throttle';
    const pastTimeDetail =
      stepType === StepTypeEnum.DELAY ? DetailEnum.DELAY_MISCONFIGURATION : DetailEnum.THROTTLE_WINDOW_IN_PAST;

    if (durationMs <= 0) {
      this.logger.error(`Dynamic ${stepTypeName} must be in the future. durationMs: ${durationMs}, jobId: ${job._id}`);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: pastTimeDetail,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: `${stepTypeName} must be in the future` }),
        })
      );

      throw new Error(`Dynamic ${stepTypeName} must be in the future. durationMs: ${durationMs}`);
    }

    const tierValidationErrors = await this.tierRestrictionsValidateUsecase.execute(
      TierRestrictionsValidateCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        stepType,
        deferDurationMs: durationMs,
      })
    );

    if (tierValidationErrors && tierValidationErrors.length > 0) {
      const errorMessage = tierValidationErrors[0].message;
      this.logger.debug(`${stepTypeName} duration exceeds tier limits: ${errorMessage}, jobId: ${job._id}`);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.DEFER_DURATION_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ errorMessage }),
        })
      );

      throw new Error(`${stepTypeName} duration exceeds tier limits: ${errorMessage}`);
    }
  }

  private async handleStepValidationError(
    command: AddJobCommand,
    job: JobEntity,
    error: Error,
    stepType: StepTypeEnum,
    detail: DetailEnum
  ): Promise<AddJobResult> {
    const stepTypeName = stepType.toLowerCase();
    this.logger.debug(`${stepTypeName} validation failed for job ${job._id}: ${error.message}`);

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({ error: error.message }),
      })
    );

    await this.jobRepository.updateOne(
      { _id: job._id, _environmentId: command.environmentId },
      {
        $set: {
          status: JobStatusEnum.FAILED,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        },
      }
    );

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.FAILED,
    });

    return {
      workflowStatus: WorkflowRunStatusEnum.ERROR,
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED,
    };
  }

  private async fetchBridgeData(
    command: AddJobCommand,
    filterVariables: IFilterVariables,
    workflow?: NotificationTemplateEntity
  ): Promise<ExecuteOutput | null> {
    const response = await this.executeBridgeJob.execute(
      ExecuteBridgeJobCommand.create({
        identifier: command.job.identifier,
        ...command,
        variables: filterVariables,
        workflow,
      })
    );

    if (!response) {
      return null;
    }

    return response;
  }

  private async updateMetadata(response: ExecuteOutput, command: AddJobCommand, untilDate?: Date | null) {
    let metadata = {} as IWorkflowStepMetadata;

    if (command.job.type === StepTypeEnum.DELAY) {
      return this.updateDelayMetadata(response, command);
    }

    const digest = command.job.digest as IDigestBaseMetadata;

    const outputs = response.outputs as DigestOutput;
    // digest value is pre-computed by framework and passed as digestKey
    const outputDigestValue = outputs?.digestKey;
    const digestType = getDigestType(outputs);

    if (isTimedOutput(outputs)) {
      metadata = {
        type: DigestTypeEnum.TIMED,
        digestValue: outputDigestValue || 'No-Value-Provided',
        digestKey: digest.digestKey || 'No-Key-Provided',
        timed: { cronExpression: outputs?.cron, untilDate: untilDate?.toISOString() },
      } as IDigestTimedMetadata;
      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestValue': metadata.digestValue,
            'digest.digestKey': metadata.digestKey,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
            'digest.timed.cronExpression': metadata.timed?.cronExpression,
            'digest.timed.untilDate': metadata.timed?.untilDate,
          },
        }
      );
    }

    if (isLookBackDigestOutput(outputs)) {
      metadata = {
        type: digestType,
        amount: outputs?.amount,
        digestValue: outputDigestValue || 'No-Value-Provided',
        digestKey: digest.digestKey || 'No-Key-Provided',
        unit: outputs.unit ? castUnitToDigestUnitEnum(outputs?.unit) : undefined,
        backoff: digestType === DigestTypeEnum.BACKOFF,
        backoffAmount: outputs.lookBackWindow?.amount,
        backoffUnit: outputs.lookBackWindow?.unit ? castUnitToDigestUnitEnum(outputs.lookBackWindow.unit) : undefined,
      } as IDigestRegularMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestValue': metadata.digestValue,
            'digest.digestKey': metadata.digestKey,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
            'digest.backoff': metadata.backoff,
            'digest.backoffAmount': metadata.backoffAmount,
            'digest.backoffUnit': metadata.backoffUnit,
          },
        }
      );
    }

    if (isRegularOutput(outputs)) {
      if (!outputs.amount && !outputs.unit) {
        outputs.amount = 0;
        outputs.unit = 'seconds';
      }

      metadata = {
        type: digestType,
        amount: outputs?.amount,
        digestKey: digest.digestKey || 'No-Key-Provided',
        digestValue: outputDigestValue || 'No-Value-Provided',
        unit: outputs.unit ? castUnitToDigestUnitEnum(outputs?.unit) : undefined,
      } as IDigestRegularMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestKey': metadata.digestKey,
            'digest.digestValue': metadata.digestValue,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
          },
        }
      );
    }

    return metadata;
  }

  private async updateDelayMetadata(response: ExecuteOutput, command: AddJobCommand) {
    const outputs = response.outputs as DelayOutput;
    let metadata = {} as IWorkflowStepMetadata;

    if (isDynamicOutput(outputs)) {
      metadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: (outputs as unknown as { dynamicKey: string }).dynamicKey,
      } as IDelayDynamicMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'step.metadata.type': metadata.type,
            'step.metadata.dynamicKey': (metadata as IDelayDynamicMetadata).dynamicKey,
          },
        }
      );
    } else if (isTimedOutput(outputs)) {
      metadata = {
        type: DelayTypeEnum.TIMED,
        amount: 0,
        unit: castUnitToDigestUnitEnum('seconds'),
      } as IDelayTimedMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'step.metadata.type': DelayTypeEnum.TIMED,
          },
        }
      );
    } else if (isRegularOutput(outputs)) {
      const regularOutputs = outputs as { amount?: number; unit?: string };
      metadata = {
        type: DelayTypeEnum.REGULAR,
        amount: regularOutputs?.amount || 0,
        unit: regularOutputs.unit ? castUnitToDigestUnitEnum(regularOutputs?.unit) : undefined,
      } as IDelayRegularMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'step.metadata.type': metadata.type,
            'step.metadata.amount': metadata.amount,
            'step.metadata.unit': metadata.unit,
          },
        }
      );
    }

    return metadata;
  }

  private parseDynamicDurationValue(
    job: JobEntity,
    dynamicKey: string,
    stepType: 'delay' | 'throttle'
  ): { durationMs: number; identifier: string } | null {
    const keyPath = dynamicKey?.replace('payload.', '');
    const value = getNestedValue(job.payload, keyPath);

    if (!value) {
      this.logger.debug(`Dynamic ${stepType} key '${dynamicKey}' not found in payload data`);

      return null;
    }

    if (typeof value === 'string' && DurationUtils.isISO8601(value)) {
      const targetTime = new Date(value).getTime();
      const now = Date.now();

      return {
        durationMs: targetTime - now,
        identifier: value,
      };
    }

    if (typeof value === 'object' && value !== null && 'unit' in value && 'amount' in value) {
      const durationObj = value as { unit: string; amount: number };

      try {
        const durationMs = DurationUtils.convertToMilliseconds(durationObj.amount, durationObj.unit);

        return {
          durationMs,
          identifier: `${durationObj.amount}:${durationObj.unit}`,
        };
      } catch (error) {
        this.logger.warn(`Invalid ${stepType} duration unit '${durationObj.unit}': ${error.message}`);

        return null;
      }
    }

    this.logger.warn(`Dynamic ${stepType} value '${JSON.stringify(value)}' is not a valid format`);

    return null;
  }

  private async handleThrottle(
    command: AddJobCommand,
    job: JobEntity,
    bridgeResponse: ExecuteOutput | null
  ): Promise<{ shouldSkip: boolean; executionCount?: number; threshold?: number; throttledUntil?: string }> {
    // Get throttle configuration from bridge response or job step
    const throttleConfig = bridgeResponse?.outputs || {};
    const { type = 'fixed', threshold = 1, throttleKey } = throttleConfig;

    let windowMs: number;

    if (type === 'fixed') {
      const { amount, unit } = throttleConfig;
      if (!amount || !unit) {
        this.logger.warn(`Fixed throttle configuration missing amount or unit for job ${job._id}`);
        return { shouldSkip: false };
      }

      try {
        windowMs = DurationUtils.convertToMilliseconds(amount as number, unit as string);
      } catch {
        this.logger.warn(`Invalid throttle unit '${unit}' for job ${job._id}`);
        return { shouldSkip: false };
      }
    } else if (type === 'dynamic') {
      const { dynamicKey } = throttleConfig;
      if (!dynamicKey) {
        this.logger.warn(`Dynamic throttle configuration missing dynamicKey for job ${job._id}`);
        return { shouldSkip: false };
      }

      // Parse dynamic window value
      const dynamicValue = this.parseDynamicDurationValue(job, dynamicKey as string, 'throttle');
      if (!dynamicValue) {
        this.logger.warn(`Could not parse dynamic throttle value for job ${job._id}, key: ${dynamicKey}`);
        return { shouldSkip: false };
      }

      windowMs = dynamicValue.durationMs;
    } else {
      this.logger.warn(`Unknown throttle type '${type}' for job ${job._id}`);
      return { shouldSkip: false };
    }

    const nowMs = Date.now();

    // Validate throttle window duration
    await this.validateThrottleWindow(command, job, windowMs, type);

    if (!job.step.stepId) {
      throw new Error('Step ID is required for throttle reservation');
    }

    const throttleValue = throttleKey ? getNestedValue(job.payload, throttleKey as string) : 'default';

    const throttleJobId = `${job._id}:${Date.now()}`;

    const reservationResult = await this.redisThrottleService.reserveThrottleSlot({
      environmentId: command.environmentId,
      subscriberId: job._subscriberId,
      workflowId: job._templateId,
      stepId: job.step.stepId,
      jobId: throttleJobId,
      windowMs,
      limit: threshold as number,
      nowMs,
      throttleKey: (throttleKey as string) || 'default',
      throttleValue: throttleValue,
    });

    this.logger.debug(
      {
        jobId: job._id,
        reservationResult,
        threshold,
        windowMs,
        type,
      },
      'Redis throttle reservation result'
    );

    if (!reservationResult.granted) {
      return {
        shouldSkip: true,
        executionCount: reservationResult.count,
        threshold: threshold as number,
        throttledUntil: new Date(reservationResult.windowStartMs + windowMs).toISOString(),
      };
    }

    // Slot reserved successfully, proceed with execution
    return {
      shouldSkip: false,
      executionCount: reservationResult.count,
      threshold: threshold as number,
      throttledUntil: new Date(reservationResult.windowStartMs + windowMs).toISOString(),
    };
  }

  private async handleDigest({
    command,
    job,
    bridgeResponse,
    bridgeDelayAmountDate,
    bridgeDelayAmount,
    timezone,
  }: {
    command: AddJobCommand;
    job: JobEntity;
    bridgeResponse: ExecuteOutput | null;
    bridgeDelayAmountDate: Date | null;
    bridgeDelayAmount: number | undefined;
    timezone: string | undefined;
  }) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      metadata = await this.updateMetadata(bridgeResponse, command, bridgeDelayAmountDate);
    } else {
      metadata = job.digest || ({} as IWorkflowStepMetadata);
    }

    // Update the job digest directly to avoid an extra database call
    command.job.digest = { ...command.job.digest, ...metadata } as IWorkflowStepMetadata;

    validateDigest(job);

    const digestAmount =
      bridgeDelayAmount ??
      this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: metadata,
        payload: job.payload,
        overrides: job.overrides,
        timezone,
      });

    this.logger.debug(`Digest step amount is: ${digestAmount}`);

    const digestCreationResult = await this.mergeOrCreateDigestUsecase.execute(
      MergeOrCreateDigestCommand.create({
        job,
      })
    );

    if (digestCreationResult === DigestCreationResultEnum.MERGED) {
      this.handleDigestMerged();
    }

    if (digestCreationResult === DigestCreationResultEnum.SKIPPED) {
      await this.handleDigestSkip(command, job);
    }

    return { digestAmount, digestCreationResult, cronExpression: bridgeResponse?.outputs?.cron as string | undefined };
  }

  private getBridgeNextCronDate(bridgeResponse: ExecuteOutput | null, timezone?: string): Date | null {
    const outputs = bridgeResponse?.outputs as DigestOutput | DelayOutput;
    if (!isTimedOutput(outputs) || !outputs.cron) {
      return null;
    }

    const bridgeAmountExpression = parseCronExpression(outputs.cron, { tz: timezone });
    const bridgeAmountDate = bridgeAmountExpression.next();

    return bridgeAmountDate.toDate();
  }

  private handleDigestMerged() {
    this.logger.info('Digest was merged, queueing next job');
  }

  private async handleDigestSkip(command: AddJobCommand, job) {
    const nextJobToSchedule = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: job._id,
    });

    if (!nextJobToSchedule) {
      return;
    }

    await this.execute({
      userId: job._userId,
      environmentId: job._environmentId,
      organizationId: command.organizationId,
      jobId: nextJobToSchedule._id,
      job: nextJobToSchedule,
    });
  }

  private async handleThrottleSkip(
    command: AddJobCommand,
    job: JobEntity,
    throttleResult: { shouldSkip: boolean; executionCount: number; threshold: number; throttledUntil: string }
  ) {
    this.logger.info(
      `Job ${job._id} throttled: ${throttleResult.executionCount} executions exceed threshold ${throttleResult.threshold as number}`
    );

    await this.jobRepository.updateOne(
      { _id: job._id, _environmentId: command.environmentId },
      {
        $set: {
          status: JobStatusEnum.SKIPPED,
          stepOutput: {
            throttled: true,
            executionCount: throttleResult.executionCount,
            threshold: throttleResult.threshold as number,
            throttledUntil: throttleResult.throttledUntil,
          },
        },
      }
    );

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.SKIPPED,
    });

    const childJobsUpdated = await this.jobRepository.updateAllChildJobStatus(job, JobStatusEnum.SKIPPED, job._id);

    if (childJobsUpdated.length > 0) {
      await this.stepRunRepository.createMany(childJobsUpdated, {
        status: JobStatusEnum.SKIPPED,
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.THROTTLE_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ ...throttleResult }),
        })
      );
    }
  }

  private getExecutionDelayAmount(
    filtered: boolean,
    digestAmount: number | undefined,
    delayAmount: undefined | number
  ) {
    return (filtered ? 0 : (digestAmount ?? delayAmount)) ?? 0;
  }

  public async queueJob({
    job,
    delay,
    untilDate,
    timezone,
  }: {
    job: JobEntity;
    delay: number;
    untilDate: Date | null;
    timezone?: string;
  }) {
    const stepContainsWebhookFilter = this.stepContainsFilter(job, 'webhook');
    const options: JobsOptions = { delay };

    if (stepContainsWebhookFilter) {
      options.backoff = {
        type: BackoffStrategiesEnum.WEBHOOK_FILTER_BACKOFF,
      };
      options.attempts = this.standardQueueService.DEFAULT_ATTEMPTS;
    }

    await this.standardQueueService.add({
      name: job._id,
      data: {
        _environmentId: job._environmentId,
        _id: job._id,
        _organizationId: job._organizationId,
        _userId: job._userId,
      },
      groupId: job._organizationId,
      options,
    });

    if (delay) {
      await this.createDelayExecutionDetails(job, delay, untilDate, timezone);
    }
  }

  private async createDelayExecutionDetails(job: JobEntity, delay: number, untilDate: Date | null, timezone?: string) {
    const logMessage =
      job.type === StepTypeEnum.DELAY
        ? 'Delay is active, Creating execution details'
        : job.type === StepTypeEnum.DIGEST
          ? 'Digest is active, Creating execution details'
          : 'Unexpected job type, Creating execution details';

    this.logger.trace(logMessage);

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: job.type === StepTypeEnum.DELAY ? DetailEnum.STEP_DELAYED : DetailEnum.STEP_DIGESTED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          delay,
          ...(untilDate && {
            untilDate: timezone
              ? formatInTimeZone(untilDate, timezone, 'yyyy-MM-dd HH:mm:ss zzz')
              : untilDate.toISOString(),
          }),
        }),
      })
    );
  }

  private stepContainsFilter(job: JobEntity, onFilter: string) {
    return job.step.filters?.some((filter) => {
      return filter.children?.some((child) => {
        return child.on === onFilter;
      });
    });
  }

  private async validateThrottleWindow(
    command: AddJobCommand,
    job: JobEntity,
    windowMs: number,
    throttleType: string
  ): Promise<void> {
    if (throttleType === 'dynamic') {
      await this.validateDynamicDuration(command, job, windowMs, StepTypeEnum.THROTTLE);
    }
  }
}

const DEFERRED_JOB_TYPE_MAP: Record<StepTypeEnum, boolean> = {
  [StepTypeEnum.DELAY]: true,
  [StepTypeEnum.DIGEST]: true,
  [StepTypeEnum.THROTTLE]: true,
  [StepTypeEnum.TRIGGER]: false,
  [StepTypeEnum.CUSTOM]: false,
  [StepTypeEnum.HTTP_REQUEST]: false,
  [StepTypeEnum.IN_APP]: false,
  [StepTypeEnum.EMAIL]: false,
  [StepTypeEnum.SMS]: false,
  [StepTypeEnum.CHAT]: false,
  [StepTypeEnum.PUSH]: false,
};

function isJobDeferredType(jobType: StepTypeEnum | undefined): boolean {
  if (!jobType) return false;

  return DEFERRED_JOB_TYPE_MAP[jobType];
}

function isShouldHaltJobExecution(digestCreationResult: DigestCreationResultEnum) {
  return [DigestCreationResultEnum.MERGED, DigestCreationResultEnum.SKIPPED].includes(digestCreationResult);
}
